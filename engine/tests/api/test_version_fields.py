import os
from importlib.metadata import version
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

def test_settings_exposes_version_fields():
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        app = create_app(repo); client = TestClient(app); client.portal = portal
        body = client.get("/settings").json()
        assert body["engine_version"] == version("againpage")   # derived from the manifest
        assert body["min_reader_version"] == "0.1.0"
