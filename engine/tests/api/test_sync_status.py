import os
from fastapi.testclient import TestClient
from anyio.from_thread import start_blocking_portal
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.api.app import create_app

async def _prep():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool); await repo.ensure_local_user()
    return repo

def test_sync_state_and_status_and_clamp():
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        uid = portal.call(repo.ensure_local_user)
        app = create_app(repo); client = TestClient(app); client.portal = portal
        # no sync yet
        s0 = client.get("/status").json()
        assert s0["synced"] is None and s0["sync_failed"] is None and s0["last_synced_at"] is None
        # record a sync
        portal.call(lambda: repo.set_sync_state(uid, scanned=56, synced=54, failed=2))
        s1 = client.get("/status").json()
        assert s1["synced"] == 54 and s1["sync_failed"] == 2 and s1["last_synced_at"] is not None
        # interval clamps on save
        client.put("/settings", json={"sync_interval_minutes": 15})
        assert client.get("/settings").json()["sync_interval_minutes"] == 30
        client.put("/settings", json={"sync_interval_minutes": 0})
        assert client.get("/settings").json()["sync_interval_minutes"] == 0
