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


async def _index_def(repo) -> str | None:
    """indexdef of the notes.embedding HNSW index, or None if there is none."""
    async with repo.pool.connection() as conn:
        cur = await conn.execute(
            "SELECT indexdef FROM pg_indexes WHERE indexname = 'idx_notes_embedding'")
        row = await cur.fetchone()
    return row[0] if row else None


async def test_dimension_above_2000_uses_a_halfvec_hnsw_index():
    """pgvector caps a plain `vector` HNSW index at 2000 dims. A 3072-dim model
    (e.g. text-embedding-3-large) must migrate cleanly — before the fix this
    raised ProgramLimitExceeded ('cannot have more than 2000 dimensions')."""
    repo = await _repo()
    assert await repo.ensure_embedding_dim(3072) is True
    assert await repo.embedding_dim() == 3072
    definition = await _index_def(repo)
    assert definition is not None                          # an ANN index still exists
    assert "halfvec" in definition.lower()                 # built on the half-precision cast


async def test_high_dimension_nearest_notes_runs_and_ranks():
    """With a >2000-dim halfvec index, nearest_notes must cast the query to the
    same halfvec type — otherwise it either errors or silently skips the index."""
    repo = await _repo()
    uid = await repo.ensure_local_user()
    await repo.ensure_embedding_dim(3072)
    await repo.upsert_note(NewNote(user_id=uid, vault_path="near.md", title="Near", content_hash="h1",
        substantive=True, summary="s", tags=["t"], embedding=[0.9] + [0.0] * 3071))
    await repo.upsert_note(NewNote(user_id=uid, vault_path="far.md", title="Far", content_hash="h2",
        substantive=True, summary="s", tags=["t"], embedding=[0.0] * 3071 + [0.9]))
    hits = await repo.nearest_notes([1.0] + [0.0] * 3071, limit=1, exclude=set())
    assert [h.title for h in hits] == ["Near"]             # closest by cosine, query ran without error


async def test_dimension_beyond_halfvec_limit_skips_index_without_crashing():
    """Above 4000 dims even a halfvec HNSW index is impossible. We must still
    migrate the column (vectors store up to 16000 dims) and simply skip the
    ANN index rather than crash — lookups fall back to a sequential scan."""
    repo = await _repo()
    assert await repo.ensure_embedding_dim(5000) is True
    assert await repo.embedding_dim() == 5000
    assert await _index_def(repo) is None                  # no HNSW index, no crash
