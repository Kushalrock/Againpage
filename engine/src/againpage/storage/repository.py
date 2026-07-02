from __future__ import annotations
import json
from datetime import date, time
from uuid import UUID
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from againpage.core.models import (SettingsRow, IssueRow, NewIssue,
    NewNote, NoteRow, LinkEdge, NoteNeighbor, ThemeRow, ClusterInput)

_SETTINGS_COLS = ("user_id","vault_path","excluded_paths","profile_text","cadence",
    "delivery_time","reading_min","notes_per_issue","provider","ollama_endpoint",
    "embed_model","summary_model","writer_model")

def _settings_row(d: dict) -> SettingsRow:
    return SettingsRow(**{k: d[k] for k in _SETTINGS_COLS})

def _issue_row(d: dict) -> IssueRow:
    return IssueRow(
        id=d["id"], user_id=d["user_id"], issue_no=d["issue_no"], issue_date=d["issue_date"],
        theme_id=d["theme_id"], theme_label=d["theme_label"], reading_min=d["reading_min"],
        word_target=d["word_target"], content=d["content"], payload=d["payload"],
        model=d["model"], status=d["status"], synced_at=d["synced_at"], created_at=d["created_at"])

def _note_row(d: dict) -> NoteRow:
    return NoteRow(id=d["id"], user_id=d["user_id"], vault_path=d["vault_path"], title=d["title"],
        content_hash=d["content_hash"], substantive=d["substantive"], summary=d["summary"],
        tags=list(d["tags"]), embedding=list(d["embedding"]) if d["embedding"] is not None else None,
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

    async def themes(self, user_id) -> list[ThemeRow]:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute("SELECT * FROM themes WHERE user_id=%s", (user_id,))
            return [ThemeRow(id=r["id"], user_id=r["user_id"], label=r["label"],
                centroid=list(r["centroid"]) if r["centroid"] is not None else None,
                membership_hash=r["membership_hash"], last_visited_at=r["last_visited_at"],
                created_at=r["created_at"]) for r in await cur.fetchall()]

    async def theme_members(self, theme_id) -> list[NoteRow]:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                """SELECT n.* FROM notes n JOIN note_themes nt ON nt.note_id=n.id
                   WHERE nt.theme_id=%s AND n.active""", (theme_id,))
            return [_note_row(r) for r in await cur.fetchall()]
