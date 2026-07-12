import os
from datetime import date
from fastapi.testclient import TestClient
from anyio.from_thread import start_blocking_portal
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewIssue
from againpage.api.app import create_app

async def _prep():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool)
    await repo.ensure_local_user()
    return repo

def test_archive_flags_and_patch():
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        uid = portal.call(repo.ensure_local_user)
        issue = portal.call(repo.insert_issue, NewIssue(
            user_id=uid, issue_no=1, issue_date=date(2026, 7, 1), theme_id=None,
            theme_label="T", reading_min=5, word_target=800,
            content={"title": "T", "dek": "d", "standfirst": "s", "sources": [], "lead": "l"}))
        app = create_app(repo)
        client = TestClient(app); client.portal = portal

        # archive item carries the flags (defaults)
        item = client.get("/issues").json()["groups"][0]["items"][0]
        assert item["active"] is True and item["favorite"] is False

        # PATCH favourite on
        r = client.patch(f"/issues/{issue.id}", json={"favorite": True})
        assert r.status_code == 200 and r.json() == {"id": str(issue.id), "active": True, "favorite": True}

        # PATCH inactive; favourite unchanged
        r = client.patch(f"/issues/{issue.id}", json={"active": False})
        assert r.json()["active"] is False and r.json()["favorite"] is True

        # bogus id → 404
        from uuid import uuid4
        assert client.patch(f"/issues/{uuid4()}", json={"active": False}).status_code == 404
