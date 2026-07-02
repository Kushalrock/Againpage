import os
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.storage.seed import seed_sample_issue

def test_make_pool_open_false_constructs_without_running_loop():
    # must NOT raise RuntimeError even though no event loop is running
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN), open=False)
    assert pool is not None

async def test_async_boot_opens_migrates_seeds():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN), open=False)
    await pool.open()
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool)
    uid = await repo.ensure_local_user()
    if (await repo.latest_issue(uid)) is None:
        await seed_sample_issue(repo, uid)
    assert (await repo.latest_issue(uid)) is not None
    await pool.close()
