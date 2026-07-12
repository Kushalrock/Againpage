import os
from fastapi.testclient import TestClient
from anyio.from_thread import start_blocking_portal
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.api.app import create_app
from againpage.generation import prompts


async def _prep():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool)
    await repo.ensure_local_user()
    return repo


def test_prompts_defaults():
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        client = TestClient(create_app(repo))
        client.portal = portal
        d = client.get("/prompts/defaults").json()
        assert d["writer"] == prompts.WRITER_VOICE and d["note_expand"] == prompts.NOTE_EXPAND_VOICE
