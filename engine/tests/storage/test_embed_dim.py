import os
from datetime import date
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewNote, ClusterInput, NewIssue


async def _repo() -> Repository:
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return Repository(pool)


async def test_default_dimension_is_768():
    repo = await _repo()
    assert await repo.embedding_dim() == 768


async def test_ensure_same_dimension_is_a_noop():
    repo = await _repo()
    assert await repo.ensure_embedding_dim(768) is False
    assert await repo.embedding_dim() == 768


async def test_ensure_new_dimension_migrates_and_invalidates_derived_data():
    repo = await _repo()
    uid = await repo.ensure_local_user()
    note = await repo.upsert_note(NewNote(user_id=uid, vault_path="a.md", title="A", content_hash="h",
        substantive=True, summary="s", tags=["t"], embedding=[0.1] * 768))
    await repo.replace_clustering(uid, [ClusterInput(label="T", centroid=[0.1] * 768,
        membership_hash="m", member_ids=[note.id], weights={note.id: 1.0}, last_visited_at=None)])
    theme = (await repo.themes(uid))[0]
    # An issue referencing the theme — exercises the FK-safe theme clear.
    await repo.insert_issue(NewIssue(user_id=uid, issue_no=await repo.next_issue_no(uid),
        issue_date=date(2026, 7, 4), theme_id=theme.id, theme_label="T", reading_min=5,
        word_target=1000, content={"title": "T"}, payload={}, model="m"))

    changed = await repo.ensure_embedding_dim(1536)

    assert changed is True
    assert await repo.embedding_dim() == 1536
    assert await repo.themes(uid) == []                        # themes cleared (FK-safe)
    refreshed = await repo.note_by_path(uid, "a.md")
    assert refreshed.content_hash == ""                        # forced to re-embed on next ingest
    assert await repo.ensure_embedding_dim(1536) is False      # idempotent


async def test_new_dimension_accepts_matching_vectors_afterward():
    repo = await _repo()
    uid = await repo.ensure_local_user()
    await repo.ensure_embedding_dim(1536)
    # A 1536-dim embedding now inserts cleanly (would have raised at 768).
    note = await repo.upsert_note(NewNote(user_id=uid, vault_path="b.md", title="B", content_hash="h2",
        substantive=True, summary="s", tags=["t"], embedding=[0.2] * 1536))
    assert note.vault_path == "b.md"
