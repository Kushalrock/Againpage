import os
from datetime import timedelta
from againpage.storage import db, migrate
from againpage.queue.queue import Queue

async def fresh_queue() -> Queue:
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return Queue(pool)

async def test_enqueue_claim_complete():
    q = await fresh_queue()
    jid = await q.enqueue("generate", {"n": 1})
    job = await q.claim()
    assert job is not None and job.id == jid and job.type == "generate" and job.attempts == 1
    assert (await q.claim()) is None          # already running → not re-claimed
    await q.complete(job.id)

async def test_enqueue_if_absent_coalesces_queued_jobs():
    q = await fresh_queue()
    assert await q.enqueue_if_absent("ingest", {}) is True       # first: inserts
    assert await q.enqueue_if_absent("ingest", {}) is False      # already queued: skipped
    # A running job doesn't block a fresh enqueue (a change mid-run still lands).
    job = await q.claim()
    assert job is not None and job.type == "ingest"
    assert await q.enqueue_if_absent("ingest", {}) is True       # nothing queued now → inserts
    # And that new one is claimable.
    nxt = await q.claim()
    assert nxt is not None and nxt.type == "ingest" and nxt.id != job.id


async def test_fail_reschedules():
    q = await fresh_queue()
    await q.enqueue("ingest", {})
    job = await q.claim()
    await q.fail(job.id, retry_in=timedelta(seconds=0))
    again = await q.claim()
    assert again is not None and again.attempts == 2


async def test_fail_with_no_retry_dead_letters():
    # retry_in=None marks the job failed permanently — never re-claimed.
    q = await fresh_queue()
    await q.enqueue("generate", {})
    job = await q.claim()
    await q.fail(job.id, retry_in=None)
    assert (await q.claim()) is None


async def test_cancel_marks_running_and_is_cancelled_reports_it():
    q = await fresh_queue()
    await q.enqueue("ingest", {"force": True})
    job = await q.claim()                      # now running
    assert (await q.is_cancelled(job.id)) is False
    n = await q.cancel("ingest")               # signals the running job
    assert n == 1
    assert (await q.is_cancelled(job.id)) is True   # worker will abort cooperatively


async def test_cancel_removes_queued_jobs():
    q = await fresh_queue()
    await q.enqueue("generate", {})
    await q.enqueue("generate", {})
    assert (await q.cancel("generate")) == 2
    assert (await q.claim()) is None           # nothing left to run


async def test_reclaim_stale_requeues_orphaned_running_jobs():
    q = await fresh_queue()
    await q.enqueue("ingest", {})
    job = await q.claim()                       # running (as if a worker then died)
    assert (await q.reclaim_stale()) == 1
    again = await q.claim()                     # requeued → claimable again
    assert again is not None and again.id == job.id
