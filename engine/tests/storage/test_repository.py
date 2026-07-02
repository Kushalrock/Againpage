import os
from datetime import date
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewIssue

async def fresh_repo() -> Repository:
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return Repository(pool)

async def test_ensure_local_user_is_idempotent():
    repo = await fresh_repo()
    a = await repo.ensure_local_user()
    b = await repo.ensure_local_user()
    assert a == b

async def test_default_settings_and_patch():
    repo = await fresh_repo()
    uid = await repo.ensure_local_user()
    s = await repo.get_settings(uid)
    assert s.reading_min == 5 and s.provider == "openrouter"
    s2 = await repo.upsert_settings(uid, {"reading_min": 12, "vault_path": "/n"})
    assert s2.reading_min == 12 and s2.vault_path == "/n"

async def test_insert_and_fetch_issue():
    repo = await fresh_repo()
    uid = await repo.ensure_local_user()
    no = await repo.next_issue_no(uid)
    row = await repo.insert_issue(NewIssue(
        user_id=uid, issue_no=no, issue_date=date(2026,6,30), theme_id=None,
        theme_label="Amor Fati", reading_min=7, word_target=1540,
        content={"title":"Amor Fati"}, payload=None, model=None))
    latest = await repo.latest_issue(uid)
    assert latest.id == row.id and latest.content["title"] == "Amor Fati"
    assert (await repo.next_issue_no(uid)) == no + 1
