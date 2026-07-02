import os
from againpage.storage import db

async def test_pool_executes_select_one():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        cur = await conn.execute("SELECT 1")
        row = await cur.fetchone()
    await pool.close()
    assert row == (1,)
