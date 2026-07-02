from __future__ import annotations
import json
from datetime import date, time
from uuid import UUID
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool
from againpage.core.models import SettingsRow, IssueRow, NewIssue

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
