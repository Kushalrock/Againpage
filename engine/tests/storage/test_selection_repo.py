import os
from datetime import date
from uuid import uuid4
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewNote, NewIssue, ClusterInput, IssueNote

async def _repo():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return Repository(pool)

async def test_context_and_seen_history_roundtrip():
    repo = await _repo(); uid = await repo.ensure_local_user()
    ids = []
    for i in range(3):
        n = await repo.upsert_note(NewNote(user_id=uid, vault_path=f"n{i}.md", title=f"N{i}",
            content_hash="h", substantive=True, summary="s", tags=["t"], embedding=[float(i)]*768))
        ids.append(n.id)
    await repo.replace_clustering(uid, [ClusterInput(label="T", centroid=[0.0]*768,
        membership_hash="h1", member_ids=ids, weights={i: 1.0 for i in ids})])
    ctx = await repo.build_selection_context(uid)
    assert ctx.themes and set(ctx.themes[0].member_ids) == set(ids)
    assert ctx.surfaced == {}   # nothing surfaced yet

    issue = await repo.insert_issue(NewIssue(user_id=uid, issue_no=1, issue_date=date(2026, 6, 30),
        theme_id=None, theme_label="T", reading_min=7, word_target=1540, content={"title": "x"}))
    await repo.record_issue_notes(issue.id, [IssueNote(note_id=ids[0], role="anchor", theme_angle="T")])
    surfaced = await repo.last_surfaced(uid)
    assert surfaced[ids[0]] == date(2026, 6, 30)
