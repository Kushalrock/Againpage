import os
import asyncio
from againpage.storage import db, migrate
from againpage.scheduler import scheduler as sched_mod
from againpage.worker.loop import run_worker


async def _fresh_pool():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return pool


async def test_scheduler_ticks_even_when_queue_is_idle(monkeypatch):
    """The scheduler heartbeat must fire while the job queue is empty — the
    normal steady state. (Regression: the tick used to sit after the idle
    `continue`, so it only ran right after a job was processed and scheduled
    editions never fired on their own.)"""
    pool = await _fresh_pool()   # empty queue: claim() always returns None

    calls: list = []

    async def spy_tick(self, *, now):
        calls.append(now)
        return False

    monkeypatch.setattr(sched_mod.Scheduler, "tick", spy_tick)

    task = asyncio.create_task(run_worker(pool, lambda s: None))
    try:
        for _ in range(60):          # up to ~3s
            if calls:
                break
            await asyncio.sleep(0.05)
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    assert calls, "scheduler.tick was never called while the queue was idle"
