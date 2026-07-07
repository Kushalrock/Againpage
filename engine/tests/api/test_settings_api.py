import os
import anyio.from_thread
from fastapi.testclient import TestClient
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.api.app import create_app

async def _client():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool); await repo.ensure_local_user()
    return TestClient(create_app(repo)), repo

def test_get_and_put_settings():
    # NOTE: plain sync test + shared blocking portal, same rationale as
    # tests/api/test_issues.py::test_health_and_today_and_archive -- the
    # AsyncConnectionPool's background workers bind to whatever event loop is
    # running when the pool opens. TestClient's default per-request portal
    # spins up a *new* throwaway loop/thread per call unless one portal is
    # shared for prep + all requests, which strands the pool's reset queue
    # and hangs a later getconn() forever.
    with anyio.from_thread.start_blocking_portal() as portal:
        client, _ = portal.call(_client)
        client.portal = portal
        s = client.get("/settings").json()
        assert s["provider"] == "openrouter" and s["reading_min"] == 5
        updated = client.put("/settings", json={"reading_min": 12, "cadence_days": 7,
            "vault_paths": ["/notes"]}).json()
        assert updated["reading_min"] == 12 and updated["cadence_days"] == 7
        assert "vault_note_count" in updated

def test_provider_test_uses_health(monkeypatch):
    from againpage.api import routes
    class FakeProvider:
        async def health(self, *, models):
            from againpage.core.models import ProviderHealth
            return ProviderHealth(ok=True, reachable=True, models={m: True for m in models})
        async def summarize(self,*a,**k): ...
        async def embed(self,*a,**k): ...
        async def generate(self,*a,**k): ...
    monkeypatch.setattr(routes, "make_provider_for_test", lambda req: FakeProvider())
    with anyio.from_thread.start_blocking_portal() as portal:
        client, _ = portal.call(_client)
        client.portal = portal
        res = client.post("/provider/test", json={"provider":"openrouter","ollama_endpoint":"",
            "embed_model":"e","summary_model":"s","writer_model":"w"}).json()
        assert res["ok"] is True and res["models"]["w"] is True
