from __future__ import annotations
import json
from datetime import date, time
from uuid import UUID
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from againpage.core.models import (SettingsRow, IssueRow, NewIssue,
    NewNote, NoteRow, LinkEdge, NoteNeighbor, ThemeRow, ClusterInput,
    SelectionContext, ThemeCtx, LinkCtx, IssueNote)

_SETTINGS_COLS = ("user_id","vault_path","excluded_paths","profile_text","cadence",
    "delivery_time","reading_min","notes_per_issue","provider","ollama_endpoint",
    "embed_model","summary_model","writer_model")

# Advisory-lock key serialising the embedding-dimension DDL across processes.
_EMBED_DIM_LOCK = 0x41474E50  # "AGNP"

def _settings_row(d: dict) -> SettingsRow:
    return SettingsRow(**{k: d[k] for k in _SETTINGS_COLS})

def _issue_row(d: dict) -> IssueRow:
    return IssueRow(
        id=d["id"], user_id=d["user_id"], issue_no=d["issue_no"], issue_date=d["issue_date"],
        theme_id=d["theme_id"], theme_label=d["theme_label"], reading_min=d["reading_min"],
        word_target=d["word_target"], content=d["content"], payload=d["payload"],
        model=d["model"], status=d["status"], synced_at=d["synced_at"], created_at=d["created_at"])

def _parse_vector(value) -> list[float] | None:
    # pgvector's psycopg adapter decodes `vector` columns to list[float] once
    # register_vector_async() has run on the serving connection. If a pool
    # connection was configured before the `vector` extension existed (e.g. a
    # test drops+recreates the schema after the pool already opened its
    # min_size connections), the adapter registration is a no-op and psycopg
    # falls back to returning the column's raw text form, e.g. "[0.1,0.2]".
    # Parse defensively so callers always get list[float] regardless of when
    # the adapter was registered.
    if value is None:
        return None
    if isinstance(value, str):
        return [float(x) for x in value.strip("[]").split(",")] if value.strip("[]") else []
    return list(value)

def _note_row(d: dict) -> NoteRow:
    return NoteRow(id=d["id"], user_id=d["user_id"], vault_path=d["vault_path"], title=d["title"],
        content_hash=d["content_hash"], substantive=d["substantive"], summary=d["summary"],
        tags=list(d["tags"]), embedding=_parse_vector(d["embedding"]),
        active=d["active"], updated_at=d["updated_at"])

class Repository:
    def __init__(self, pool: AsyncConnectionPool):
        self.pool = pool

    async def ensure_local_user(self) -> UUID:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute("SELECT id FROM users ORDER BY created_at LIMIT 1")
            row = await cur.fetchone()
            if row:
                uid = row["id"]
            else:
                cur = await conn.execute("INSERT INTO users DEFAULT VALUES RETURNING id")
                uid = (await cur.fetchone())["id"]
            await conn.execute(
                "INSERT INTO settings(user_id) VALUES (%s) ON CONFLICT DO NOTHING", (uid,))
            return uid

    async def get_settings(self, user_id: UUID) -> SettingsRow | None:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute("SELECT * FROM settings WHERE user_id=%s", (user_id,))
            row = await cur.fetchone()
            return _settings_row(row) if row else None

    async def upsert_settings(self, user_id: UUID, patch: dict) -> SettingsRow:
        allowed = {k: v for k, v in patch.items() if k in _SETTINGS_COLS and k != "user_id"}
        if allowed:
            sets = ", ".join(f"{k}=%s" for k in allowed)
            async with self.pool.connection() as conn:
                await conn.execute(
                    f"UPDATE settings SET {sets} WHERE user_id=%s",
                    (*allowed.values(), user_id))
        return await self.get_settings(user_id)

    async def next_issue_no(self, user_id: UUID) -> int:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                "SELECT COALESCE(MAX(issue_no),0)+1 as next_no FROM issues WHERE user_id=%s", (user_id,))
            row = await cur.fetchone()
            return row["next_no"]

    async def insert_issue(self, row: NewIssue) -> IssueRow:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                """INSERT INTO issues(user_id,issue_no,issue_date,theme_id,theme_label,
                       reading_min,word_target,content,payload,model,status)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                (row.user_id, row.issue_no, row.issue_date, row.theme_id, row.theme_label,
                 row.reading_min, row.word_target, json.dumps(row.content),
                 json.dumps(row.payload) if row.payload is not None else None,
                 row.model, row.status))
            return _issue_row(await cur.fetchone())

    async def latest_issue(self, user_id: UUID) -> IssueRow | None:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                "SELECT * FROM issues WHERE user_id=%s ORDER BY issue_date DESC, created_at DESC LIMIT 1",
                (user_id,))
            row = await cur.fetchone()
            return _issue_row(row) if row else None

    async def get_issue(self, issue_id: UUID) -> IssueRow | None:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute("SELECT * FROM issues WHERE id=%s", (issue_id,))
            row = await cur.fetchone()
            return _issue_row(row) if row else None

    async def list_issues(self, user_id: UUID) -> list[IssueRow]:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                "SELECT * FROM issues WHERE user_id=%s ORDER BY issue_date DESC, created_at DESC",
                (user_id,))
            return [_issue_row(r) for r in await cur.fetchall()]

    async def upsert_note(self, note: NewNote) -> NoteRow:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                """INSERT INTO notes(user_id,vault_path,title,content_hash,substantive,
                        summary,tags,embedding,active,updated_at)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,TRUE,now())
                   ON CONFLICT (user_id,vault_path) DO UPDATE SET
                     title=EXCLUDED.title, content_hash=EXCLUDED.content_hash,
                     substantive=EXCLUDED.substantive, summary=EXCLUDED.summary,
                     tags=EXCLUDED.tags, embedding=EXCLUDED.embedding,
                     active=TRUE, updated_at=now()
                   RETURNING *""",
                (note.user_id, note.vault_path, note.title, note.content_hash, note.substantive,
                 note.summary, note.tags, note.embedding))
            return _note_row(await cur.fetchone())

    async def note_by_path(self, user_id, vault_path):
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                "SELECT * FROM notes WHERE user_id=%s AND vault_path=%s", (user_id, vault_path))
            row = await cur.fetchone()
            return _note_row(row) if row else None

    async def active_notes(self, user_id):
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                "SELECT * FROM notes WHERE user_id=%s AND active AND substantive", (user_id,))
            return [_note_row(r) for r in await cur.fetchall()]

    async def deactivate_missing(self, user_id, seen_paths: set[str]) -> int:
        async with self.pool.connection() as conn:
            cur = await conn.execute(
                "UPDATE notes SET active=FALSE WHERE user_id=%s AND active AND NOT (vault_path = ANY(%s))",
                (user_id, list(seen_paths)))
            return cur.rowcount

    async def replace_links(self, src_note_id, edges) -> None:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            await conn.execute("DELETE FROM wikilinks WHERE src_note_id=%s", (src_note_id,))
            for e in edges:
                cur = await conn.execute(
                    "SELECT id FROM notes WHERE vault_path=%s LIMIT 1", (e.dst_vault_path,))
                dst = await cur.fetchone()
                if not dst:
                    continue
                await conn.execute(
                    """INSERT INTO wikilinks(src_note_id,dst_note_id,created_at,last_seen_at)
                       VALUES (%s,%s,now(),now()) ON CONFLICT DO NOTHING""",
                    (src_note_id, dst["id"]))

    async def nearest_notes(self, embedding, *, limit, exclude):
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                """SELECT id, vault_path, title, summary,
                          1 - (embedding <=> %s::vector) AS similarity
                   FROM notes
                   WHERE active AND substantive AND embedding IS NOT NULL
                         AND NOT (id = ANY(%s))
                   ORDER BY embedding <=> %s::vector LIMIT %s""",
                (embedding, list(exclude), embedding, limit))
            return [NoteNeighbor(note_id=r["id"], vault_path=r["vault_path"], title=r["title"],
                                 summary=r["summary"], similarity=float(r["similarity"]))
                    for r in await cur.fetchall()]

    async def replace_clustering(self, user_id, clusters: list[ClusterInput]) -> None:
        async with self.pool.connection() as conn:
            async with conn.transaction():
                await conn.execute(
                    """DELETE FROM note_themes WHERE theme_id IN
                       (SELECT id FROM themes WHERE user_id=%s)""", (user_id,))
                await conn.execute("DELETE FROM themes WHERE user_id=%s", (user_id,))
                for ci in clusters:
                    conn.row_factory = dict_row
                    cur = await conn.execute(
                        """INSERT INTO themes(user_id,label,centroid,membership_hash,last_visited_at)
                           VALUES (%s,%s,%s,%s,%s) RETURNING id""",
                        (user_id, ci.label, ci.centroid, ci.membership_hash, ci.last_visited_at))
                    theme_id = (await cur.fetchone())["id"]
                    for note_id in ci.member_ids:
                        await conn.execute(
                            """INSERT INTO note_themes(note_id,theme_id,weight)
                               VALUES (%s,%s,%s)""",
                            (note_id, theme_id, ci.weights.get(note_id, 1.0)))

    async def reset_content_hashes(self, user_id) -> int:
        """Blank every note's content_hash so the next ingest re-processes them
        all (re-summarise + re-embed), bypassing the unchanged-content skip.
        Used by a forced re-index after the summary/embedding model changes."""
        async with self.pool.connection() as conn:
            cur = await conn.execute(
                "UPDATE notes SET content_hash = '' WHERE user_id = %s", (user_id,))
            return cur.rowcount

    async def embedding_dim(self) -> int | None:
        """Declared dimension of notes.embedding (pgvector stores it in
        atttypmod), or None if the column is a dimensionless vector."""
        async with self.pool.connection() as conn:
            cur = await conn.execute(
                "SELECT atttypmod FROM pg_attribute "
                "WHERE attrelid='notes'::regclass AND attname='embedding'")
            row = await cur.fetchone()
        mod = row[0] if row else None
        return mod if mod and mod > 0 else None

    async def ensure_embedding_dim(self, dim: int) -> bool:
        """Make notes.embedding / themes.centroid VECTOR(``dim``). If the
        dimension already matches, do nothing. Otherwise recreate the columns
        and the HNSW index at ``dim`` and invalidate derived data (all
        embeddings, themes, and issue theme links) so the next re-index
        rebuilds them — vectors of different dimensions are not comparable, so
        the whole library must be re-embedded with one model at a time.

        Returns True if the dimension was changed. Serialised with a
        transaction-scoped advisory lock so concurrent API/worker starts don't
        race on the DDL. ``dim`` is coerced to int and interpolated into the
        DDL (pgvector's type modifier cannot be a bind parameter)."""
        dim = int(dim)
        if dim <= 0:
            return False
        async with self.pool.connection() as conn:
            async with conn.transaction():
                await conn.execute("SELECT pg_advisory_xact_lock(%s)", (_EMBED_DIM_LOCK,))
                cur = await conn.execute(
                    "SELECT atttypmod FROM pg_attribute "
                    "WHERE attrelid='notes'::regclass AND attname='embedding'")
                row = await cur.fetchone()
                current = row[0] if row and row[0] and row[0] > 0 else None
                if current == dim:
                    return False
                await conn.execute("DROP INDEX IF EXISTS idx_notes_embedding")
                await conn.execute(f"ALTER TABLE notes ALTER COLUMN embedding TYPE vector({dim}) USING NULL")
                # Derived data is now the wrong dimension — clear it. Null the
                # issue->theme links first (that FK has no ON DELETE action).
                await conn.execute("UPDATE issues SET theme_id = NULL WHERE theme_id IS NOT NULL")
                await conn.execute("DELETE FROM note_themes")
                await conn.execute("DELETE FROM themes")
                await conn.execute(f"ALTER TABLE themes ALTER COLUMN centroid TYPE vector({dim}) USING NULL")
                await conn.execute(
                    "CREATE INDEX idx_notes_embedding ON notes USING hnsw (embedding vector_cosine_ops)")
                # Force every note to re-embed on the next ingest (the content
                # hash gate would otherwise skip unchanged files).
                await conn.execute("UPDATE notes SET content_hash = ''")
                return True

    async def themes(self, user_id) -> list[ThemeRow]:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute("SELECT * FROM themes WHERE user_id=%s", (user_id,))
            return [ThemeRow(id=r["id"], user_id=r["user_id"], label=r["label"],
                centroid=_parse_vector(r["centroid"]),
                membership_hash=r["membership_hash"], last_visited_at=r["last_visited_at"],
                created_at=r["created_at"]) for r in await cur.fetchall()]

    async def theme_members(self, theme_id) -> list[NoteRow]:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                """SELECT n.* FROM notes n JOIN note_themes nt ON nt.note_id=n.id
                   WHERE nt.theme_id=%s AND n.active""", (theme_id,))
            return [_note_row(r) for r in await cur.fetchall()]

    async def last_surfaced(self, user_id):
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                """SELECT ino.note_id, MAX(i.issue_date) AS d
                   FROM issue_notes ino JOIN issues i ON i.id = ino.issue_id
                   WHERE i.user_id=%s GROUP BY ino.note_id""", (user_id,))
            return {r["note_id"]: r["d"] for r in await cur.fetchall()}

    async def record_issue_notes(self, issue_id, rows) -> None:
        async with self.pool.connection() as conn:
            for r in rows:
                await conn.execute(
                    """INSERT INTO issue_notes(issue_id,note_id,role,theme_angle)
                       VALUES (%s,%s,%s,%s) ON CONFLICT DO NOTHING""",
                    (issue_id, r.note_id, r.role, r.theme_angle))

    async def touch_theme_visited(self, theme_id, when) -> None:
        async with self.pool.connection() as conn:
            await conn.execute("UPDATE themes SET last_visited_at=%s WHERE id=%s", (when, theme_id))

    async def touch_link_seen(self, src, dst, when) -> None:
        async with self.pool.connection() as conn:
            await conn.execute(
                """UPDATE wikilinks SET last_seen_at=%s
                   WHERE (src_note_id=%s AND dst_note_id=%s) OR (src_note_id=%s AND dst_note_id=%s)""",
                (when, src, dst, dst, src))

    async def build_selection_context(self, user_id):
        notes = {n.id: n for n in await self.active_notes(user_id)}
        theme_rows = await self.themes(user_id)
        themes = []
        for t in theme_rows:
            members = await self.theme_members(t.id)
            themes.append(ThemeCtx(theme_id=t.id, label=t.label, centroid=t.centroid or [0.0]*768,
                last_visited_at=t.last_visited_at, member_ids=[m.id for m in members]))
        surfaced = await self.last_surfaced(user_id)
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                """SELECT src_note_id, dst_note_id, created_at, last_seen_at FROM wikilinks
                   WHERE src_note_id IN (SELECT id FROM notes WHERE user_id=%s)""", (user_id,))
            links = [LinkCtx(src=r["src_note_id"], dst=r["dst_note_id"],
                created_at=r["created_at"], last_seen_at=r["last_seen_at"]) for r in await cur.fetchall()]
        settings = await self.get_settings(user_id)
        return SelectionContext(themes=themes, notes_by_id=notes, surfaced=surfaced,
            links=links, notes_per_issue=settings.notes_per_issue if settings else 3)
