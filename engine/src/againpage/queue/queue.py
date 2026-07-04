from __future__ import annotations
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool

@dataclass
class Job:
    id: UUID
    type: str
    payload: dict
    attempts: int

class Queue:
    def __init__(self, pool: AsyncConnectionPool):
        self.pool = pool

    async def enqueue(self, type: str, payload: dict, *, run_after: datetime | None = None) -> UUID:
        async with self.pool.connection() as conn:
            cur = await conn.execute(
                """INSERT INTO jobs(type,payload,run_after)
                   VALUES (%s,%s,COALESCE(%s, now())) RETURNING id""",
                (type, json.dumps(payload), run_after))
            return (await cur.fetchone())[0]

    async def claim(self) -> Job | None:
        async with self.pool.connection() as conn:
            conn.row_factory = dict_row
            cur = await conn.execute(
                """UPDATE jobs SET status='running', locked_at=now(), attempts=attempts+1
                   WHERE id = (
                     SELECT id FROM jobs
                     WHERE status='queued' AND run_after <= now()
                     ORDER BY run_after FOR UPDATE SKIP LOCKED LIMIT 1)
                   RETURNING id, type, payload, attempts""")
            row = await cur.fetchone()
            if not row:
                return None
            return Job(id=row["id"], type=row["type"], payload=row["payload"], attempts=row["attempts"])

    async def active_types(self) -> list[str]:
        """Distinct types of jobs currently queued or running — so the UI can
        disable a trigger while its job is in flight (avoiding duplicate queueing)."""
        async with self.pool.connection() as conn:
            cur = await conn.execute(
                "SELECT DISTINCT type FROM jobs WHERE status IN ('queued','running')")
            return sorted(r[0] for r in await cur.fetchall())

    async def cancel(self, type: str) -> int:
        """Remove queued (not-yet-started) jobs of a type — including ones
        waiting to retry. A running job can't be interrupted mid-flight, so it
        is left to finish. Returns how many were removed."""
        async with self.pool.connection() as conn:
            cur = await conn.execute(
                "DELETE FROM jobs WHERE type = %s AND status = 'queued'", (type,))
            return cur.rowcount

    async def complete(self, job_id: UUID) -> None:
        async with self.pool.connection() as conn:
            await conn.execute("UPDATE jobs SET status='done' WHERE id=%s", (job_id,))

    async def fail(self, job_id: UUID, *, retry_in: timedelta | None) -> None:
        async with self.pool.connection() as conn:
            if retry_in is None:
                await conn.execute("UPDATE jobs SET status='failed' WHERE id=%s", (job_id,))
            else:
                await conn.execute(
                    "UPDATE jobs SET status='queued', run_after=now() + %s WHERE id=%s",
                    (retry_in, job_id))
