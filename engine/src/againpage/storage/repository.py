from __future__ import annotations
import json
import logging
from datetime import date, time
from uuid import UUID
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from againpage.core.models import (SettingsRow, IssueRow, NewIssue,
    NewNote, NoteRow, LinkEdge, NoteNeighbor, ThemeRow, ClusterInput,
    SelectionContext, ThemeCtx, LinkCtx, IssueNote)

log = logging.getLogger(__name__)

_SETTINGS_COLS = ("user_id","vault_paths","excluded_paths","profile_text","cadence_days",
    "delivery_time","reading_min","notes_per_issue","provider","ollama_endpoint",
    "embed_model","summary_model","writer_model","openrouter_key","ollama_key")

# Advisory-lock key serialising the embedding-dimension DDL across processes.
_EMBED_DIM_LOCK = 0x41474E50  # "AGNP"

# pgvector HNSW dimension ceilings. A `vector` HNSW index is capped at 2000
# dims; the half-precision `halfvec` type lifts that to 4000. Beyond 4000 no
# HNSW index is possible (the `vector` column itself still stores up to 16000).
_HNSW_MAX_DIM = 2000
_HALFVEC_MAX_DIM = 4000


def _embedding_index_ddl(dim: int) -> str | None:
    """The ``CREATE INDEX`` for notes.embedding at ``dim`` dims, or None when no
    HNSW index can be built. At/below 2000 dims we index the ``vector`` column
    directly; above that we index its half-precision (``halfvec``) cast, which
    pgvector supports up to 4000 dims. Callers must skip index creation when this
    returns None. ``dim`` is an int interpolated into DDL (pgvector's type
    modifier cannot be a bind parameter)."""
    if dim <= _HNSW_MAX_DIM:
        return "CREATE INDEX idx_notes_embedding ON notes USING hnsw (embedding vector_cosine_ops)"
    if dim <= _HALFVEC_MAX_DIM:
        return (f"CREATE INDEX idx_notes_embedding ON notes "
                f"USING hnsw ((embedding::halfvec({dim})) halfvec_cosine_ops)")
    return None


async def _create_embedding_index(conn, dim: int) -> None:
    """Create the notes.embedding HNSW index appropriate for ``dim``, logging a
    clear message for the half-precision and no-index cases so an operator who
    picked a high-dimensional embedding model understands what happened."""
    ddl = _embedding_index_ddl(dim)
    if ddl is None:
        log.warning(
            "notes.embedding is %d-dim, above pgvector's %d-dim HNSW limit even "
            "for halfvec; skipping the ANN index. Nearest-note lookups will run "
            "a sequential scan — pick an embedding model of ≤4000 dims for "
            "an index.", dim, _HALFVEC_MAX_DIM)
        return
    await conn.execute(ddl)
    if dim > _HNSW_MAX_DIM:
        log.info(
            "notes.embedding is %d-dim, above pgvector's %d-dim `vector` HNSW "
            "limit; using a half-precision (halfvec) HNSW index instead.",
            dim, _HNSW_MAX_DIM)


def _embedding_distance_expr(dim: int) -> str:
    """The ``embedding <=> <param>`` cosine-distance SQL for a query of ``dim``
    dims, matching the index built by :func:`_embedding_index_ddl` so the planner
    can actually use it. Above 2000 dims the index is on the halfvec cast, so the
    query must cast both the column and the parameter to the same halfvec type
    (via ``::vector::halfvec`` so it works whether or not a pgvector adapter is
    registered on the connection)."""
    if _HNSW_MAX_DIM < dim <= _HALFVEC_MAX_DIM:
        return f"embedding::halfvec({dim}) <=> %s::vector::halfvec({dim})"
    return "embedding <=> %s::vector"

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

    async def note_by_title(self, user_id, title):
        """Most-recently-updated active note with this title — used to expand a
        note the reader clicked in an edition (editions reference notes by title).

        Tries an exact match first, then falls back to a format-insensitive one:
        an edition references a note by its markdown-cleaned title, which can
        differ from the stored title by emphasis markers, case, or surrounding
        whitespace (e.g. stored ``**The Engineers' Republic**`` vs referenced
        ``The Engineers' Republic``). Returns None if nothing matches at all."""
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                "SELECT * FROM notes WHERE user_id=%s AND title=%s AND active "
                "ORDER BY updated_at DESC LIMIT 1", (user_id, title))
            row = await cur.fetchone()
            if row is None:
                cur = await conn.execute(
                    "SELECT * FROM notes WHERE user_id=%s AND active "
                    "AND lower(btrim(regexp_replace(title, '[*_`]', '', 'g'))) "
                    "  = lower(btrim(regexp_replace(%s, '[*_`]', '', 'g'))) "
                    "ORDER BY updated_at DESC LIMIT 1", (user_id, title))
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
        # Distance expression must match the HNSW index built for this dimension
        # (halfvec cast above 2000 dims) or the planner falls back to a scan.
        dist = _embedding_distance_expr(len(embedding))
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                f"""SELECT id, vault_path, title, summary,
                          1 - ({dist}) AS similarity
                   FROM notes
                   WHERE active AND substantive AND embedding IS NOT NULL
                         AND NOT (id = ANY(%s))
                   ORDER BY {dist} LIMIT %s""",
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

    async def swap_reindex(self, user_id, *, dim: int, staged: list, labeled: list, seen_paths: set) -> None:
        """Apply a fully-computed re-index in ONE transaction: (re)set the
        embedding dimension, upsert every note's new summary/tags/embedding,
        deactivate notes no longer in the vault, and replace the themes. Nothing
        here does network I/O, so the transaction is short. Because it's atomic,
        a cancel/crash *before* this call leaves the old summaries, embeddings,
        and themes completely intact — readers on other connections see the old
        snapshot until this commits.

        ``staged``  : list[NewNote] (the freshly computed notes)
        ``labeled`` : list[(label:str, centroid:list[float], member_paths:list[str])]
        ``seen_paths``: every vault_path present this run (for deactivation)
        """
        from againpage.core.scoring import membership_hash
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            async with conn.transaction():
                await conn.execute("SELECT pg_advisory_xact_lock(%s)", (_EMBED_DIM_LOCK,))
                cur = await conn.execute(
                    "SELECT atttypmod FROM pg_attribute WHERE attrelid='notes'::regclass AND attname='embedding'")
                row = await cur.fetchone()
                current = row["atttypmod"] if row and row["atttypmod"] and row["atttypmod"] > 0 else None
                if current != dim:
                    await conn.execute("DROP INDEX IF EXISTS idx_notes_embedding")
                    await conn.execute(f"ALTER TABLE notes ALTER COLUMN embedding TYPE vector({dim}) USING NULL")
                    await conn.execute(f"ALTER TABLE themes ALTER COLUMN centroid TYPE vector({dim}) USING NULL")
                    await _create_embedding_index(conn, dim)
                path_to_id: dict[str, UUID] = {}
                for n in staged:
                    c = await conn.execute(
                        """INSERT INTO notes(user_id,vault_path,title,content_hash,substantive,
                                summary,tags,embedding,active,updated_at)
                           VALUES (%s,%s,%s,%s,%s,%s,%s,%s,TRUE,now())
                           ON CONFLICT (user_id,vault_path) DO UPDATE SET
                             title=EXCLUDED.title, content_hash=EXCLUDED.content_hash,
                             substantive=EXCLUDED.substantive, summary=EXCLUDED.summary,
                             tags=EXCLUDED.tags, embedding=EXCLUDED.embedding, active=TRUE, updated_at=now()
                           RETURNING id, vault_path""",
                        (n.user_id, n.vault_path, n.title, n.content_hash, n.substantive,
                         n.summary, n.tags, n.embedding))
                    r = await c.fetchone()
                    path_to_id[r["vault_path"]] = r["id"]
                await conn.execute(
                    "UPDATE notes SET active=FALSE WHERE user_id=%s AND active AND NOT (vault_path = ANY(%s))",
                    (user_id, list(seen_paths)))
                # Replace themes (FK-safe: null issue references first).
                await conn.execute("UPDATE issues SET theme_id=NULL WHERE user_id=%s AND theme_id IS NOT NULL", (user_id,))
                await conn.execute(
                    "DELETE FROM note_themes WHERE theme_id IN (SELECT id FROM themes WHERE user_id=%s)", (user_id,))
                await conn.execute("DELETE FROM themes WHERE user_id=%s", (user_id,))
                for label, centroid, member_paths in labeled:
                    member_ids = [path_to_id[p] for p in member_paths if p in path_to_id]
                    if not member_ids:
                        continue
                    cur2 = await conn.execute(
                        """INSERT INTO themes(user_id,label,centroid,membership_hash,last_visited_at)
                           VALUES (%s,%s,%s,%s,NULL) RETURNING id""",
                        (user_id, label, centroid, membership_hash(member_ids)))
                    theme_id = (await cur2.fetchone())["id"]
                    for note_id in member_ids:
                        await conn.execute(
                            "INSERT INTO note_themes(note_id,theme_id,weight) VALUES (%s,%s,1.0)",
                            (note_id, theme_id))

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
                await _create_embedding_index(conn, dim)
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
