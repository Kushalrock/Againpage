import os
from fastapi.testclient import TestClient
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.storage.seed import seed_sample_issue
from againpage.api.app import create_app

async def _prepare() -> Repository:
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool)
    uid = await repo.ensure_local_user()
    await seed_sample_issue(repo, uid)
    return repo

async def test_health_and_today_and_archive():
    repo = await _prepare()
    client = TestClient(create_app(repo))
    assert client.get("/health").json() == {"status": "ok"}
    today = client.get("/issues/today").json()
    assert today["theme_label"] == "Amor Fati"
    assert today["content"]["title"] == "Amor Fati"
    arch = client.get("/issues").json()
    assert arch["total"] == 1
    assert arch["groups"][0]["items"][0]["title"] == "Amor Fati"
