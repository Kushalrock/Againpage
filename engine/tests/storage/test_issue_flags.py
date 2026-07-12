import os
from datetime import date
from anyio.from_thread import start_blocking_portal
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewIssue

async def _prep():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool)
    uid = await repo.ensure_local_user()
    return repo, uid

def test_issue_flags_default_and_partial_update():
    with start_blocking_portal() as portal:
        repo, uid = portal.call(_prep)
        issue = portal.call(repo.insert_issue, NewIssue(
            user_id=uid, issue_no=1, issue_date=date(2026, 7, 1), theme_id=None,
            theme_label="T", reading_min=5, word_target=800, content={"x": 1}))
        # defaults
        assert issue.active is True and issue.favorite is False
        # set only favorite
        r = portal.call(lambda: repo.set_issue_flags(issue.id, favorite=True))
        assert r.favorite is True and r.active is True
        # set only active (inactive)
        r = portal.call(lambda: repo.set_issue_flags(issue.id, active=False))
        assert r.active is False and r.favorite is True   # favorite unchanged
        # unknown id → None
        from uuid import uuid4
        assert portal.call(lambda: repo.set_issue_flags(uuid4(), active=False)) is None
