import os
import anyio.from_thread
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

def test_health_and_today_and_archive():
    # NOTE: this is a plain sync test (not `async def`) on purpose, and the
    # pool is deliberately created on the same event loop that will service
    # every TestClient request.
    #
    # AsyncConnectionPool spawns its background workers (which process the
    # `reset` callback via a queued ReturnConnection task on connection
    # return) bound to whatever event loop is running at pool-open time.
    # Starlette's TestClient normally runs each request on its own throwaway
    # anyio blocking-portal thread/loop (see testclient._portal_factory)
    # unless a single portal is reused for the whole session (via `with
    # TestClient(...) as client:` or by assigning `client.portal` directly).
    # If the pool is opened on a *different* loop than the one servicing
    # requests (e.g. a separate `asyncio.run()` for setup), the queued
    # ReturnConnection tasks are stranded on a loop that never runs again:
    # `pool_available` never recovers and a later `getconn()` hangs forever.
    # Sharing one portal for both prep and requests keeps the pool's home
    # loop identical to the requests' loop, matching how uvicorn runs the
    # app for real (single loop, whole process lifetime).
    with anyio.from_thread.start_blocking_portal() as portal:
        repo = portal.call(_prepare)
        client = TestClient(create_app(repo))
        client.portal = portal
        assert client.get("/health").json() == {"status": "ok"}
        today = client.get("/issues/today").json()
        assert today["theme_label"] == "Amor Fati"
        assert today["content"]["title"] == "Amor Fati"
        arch = client.get("/issues").json()
        assert arch["total"] == 1
        assert arch["groups"][0]["items"][0]["title"] == "Amor Fati"
