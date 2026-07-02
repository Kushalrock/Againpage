import os
from psycopg.rows import dict_row
from againpage.storage import db, migrate
from againpage.queue.queue import Queue

async def test_dict_row_does_not_leak_to_queue_enqueue():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    await pool.wait()  # ensure the single min_size=1 connection is ready so the
    # next two borrows deterministically reuse the same physical connection
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    # simulate a Repository-style borrow that sets dict_row, then returns the conn
    async with pool.connection() as conn:
        conn.row_factory = dict_row
        await conn.execute("SELECT 1")
    # now a Queue.enqueue on the SAME pool must not KeyError on tuple indexing
    q = Queue(pool)
    jid = await q.enqueue("generate", {})
    assert jid is not None
    await pool.close()
