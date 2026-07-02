import os
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.storage.seed import seed_sample_issue

async def test_seed_inserts_amor_fati():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool)
    uid = await repo.ensure_local_user()
    await seed_sample_issue(repo, uid)
    latest = await repo.latest_issue(uid)
    assert latest.theme_label == "Amor Fati"
    assert latest.content["title"] == "Amor Fati"
    assert len(latest.content["connections"]) == 6
