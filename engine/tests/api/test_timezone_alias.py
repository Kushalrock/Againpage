import os
from fastapi.testclient import TestClient
from anyio.from_thread import start_blocking_portal
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.api.app import create_app


def test_tzdata_is_installed():
    # The slim runtime container ships no system tz database, so the `tzdata`
    # package must be a dependency or ZoneInfo(...) fails for every zone.
    import tzdata  # noqa: F401


async def _prep():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool); await repo.ensure_local_user()
    return repo


def test_settings_accepts_obsolete_tz_alias_and_rejects_garbage():
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        app = create_app(repo); client = TestClient(app); client.portal = portal
        # Obsolete alias (what some OSes still report) must be accepted + stored.
        r = client.put("/settings", json={"timezone": "Asia/Calcutta"})
        assert r.status_code == 200
        assert client.get("/settings").json()["timezone"] == "Asia/Calcutta"
        # A genuinely unknown zone is still rejected.
        assert client.put("/settings", json={"timezone": "Not/AZone"}).status_code == 422
