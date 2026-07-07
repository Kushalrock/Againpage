import os
import httpx
import respx
from anyio.from_thread import start_blocking_portal
from fastapi.testclient import TestClient
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewNote
from againpage.api.app import create_app


async def _prep():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool)
    uid = await repo.ensure_local_user()
    # vault_path won't exist on disk → the route falls back to the stored summary
    await repo.upsert_note(NewNote(user_id=uid, vault_path="/nope/amor.md", title="Amor Fati",
        content_hash="h", substantive=True, summary="short summary", tags=["t"], embedding=[0.1] * 768))
    await repo.upsert_settings(uid, {"summary_model": "openai/gpt-4o-mini"})
    return repo


@respx.mock
def test_expand_route_returns_long_summary_and_404s_unknown():
    respx.post("https://openrouter.ai/api/v1/chat/completions").mock(
        return_value=httpx.Response(200, json={"choices": [{"message": {"content": "A detailed take."}}]}))
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        client = TestClient(create_app(repo)); client.portal = portal
        r = client.get("/notes/expand", params={"title": "Amor Fati"})
        assert r.status_code == 200
        assert r.json() == {"title": "Amor Fati", "text": "A detailed take."}
        assert client.get("/notes/expand", params={"title": "Nope"}).status_code == 404
