import os
from datetime import datetime, timezone, date
from uuid import uuid4
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewNote, ClusterInput, NewIssue

async def _repo():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return Repository(pool)

async def test_replace_clustering_writes_themes_and_members():
    repo = await _repo(); uid = await repo.ensure_local_user()
    n1 = await repo.upsert_note(NewNote(user_id=uid, vault_path="a.md", title="A", content_hash="h",
        substantive=True, summary="s", tags=["t"], embedding=[0.1]*768))
    n2 = await repo.upsert_note(NewNote(user_id=uid, vault_path="b.md", title="B", content_hash="h",
        substantive=True, summary="s", tags=["t"], embedding=[0.2]*768))
    visited = datetime(2026, 6, 1, tzinfo=timezone.utc)
    await repo.replace_clustering(uid, [ClusterInput(label="Stoicism", centroid=[0.15]*768,
        membership_hash="h1", member_ids=[n1.id, n2.id],
        weights={n1.id: 1.0, n2.id: 0.5}, last_visited_at=visited)])
    themes = await repo.themes(uid)
    assert len(themes) == 1 and themes[0].label == "Stoicism"
    assert themes[0].last_visited_at == visited
    members = await repo.theme_members(themes[0].id)
    assert {m.vault_path for m in members} == {"a.md", "b.md"}

async def test_replace_clustering_survives_issue_referencing_a_theme():
    # Regression: re-clustering used to hit issues_theme_id_fkey when an issue
    # still referenced an old theme (the chained `cluster` job failed forever).
    repo = await _repo(); uid = await repo.ensure_local_user()
    n = await repo.upsert_note(NewNote(user_id=uid, vault_path="a.md", title="A", content_hash="h",
        substantive=True, summary="s", tags=["t"], embedding=[0.1]*768))
    await repo.replace_clustering(uid, [ClusterInput(label="Old", centroid=[0.1]*768,
        membership_hash="h1", member_ids=[n.id], weights={n.id: 1.0})])
    theme = (await repo.themes(uid))[0]
    await repo.insert_issue(NewIssue(user_id=uid, issue_no=1, issue_date=date(2026, 6, 1),
        theme_id=theme.id, theme_label="Old", reading_min=7, word_target=1200, content={}))
    # Re-cluster must NOT raise a ForeignKeyViolation.
    await repo.replace_clustering(uid, [ClusterInput(label="New", centroid=[0.1]*768,
        membership_hash="h2", member_ids=[n.id], weights={n.id: 1.0})])
    themes = await repo.themes(uid)
    assert len(themes) == 1 and themes[0].label == "New"
    issue = (await repo.list_issues(uid))[0]
    assert issue.theme_id is None            # reference nulled (FK-safe)
    assert issue.theme_label == "Old"        # label snapshot preserved for display

async def test_replace_clustering_is_a_full_rewrite():
    repo = await _repo(); uid = await repo.ensure_local_user()
    n = await repo.upsert_note(NewNote(user_id=uid, vault_path="a.md", title="A", content_hash="h",
        substantive=True, summary="s", tags=["t"], embedding=[0.1]*768))
    await repo.replace_clustering(uid, [ClusterInput(label="Old", centroid=[0.1]*768,
        membership_hash="h1", member_ids=[n.id], weights={n.id: 1.0})])
    await repo.replace_clustering(uid, [ClusterInput(label="New", centroid=[0.1]*768,
        membership_hash="h2", member_ids=[n.id], weights={n.id: 1.0})])
    themes = await repo.themes(uid)
    assert len(themes) == 1 and themes[0].label == "New"
