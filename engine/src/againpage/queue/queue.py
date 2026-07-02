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
