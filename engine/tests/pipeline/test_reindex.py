import os
from datetime import time
from uuid import uuid4
from pathlib import Path
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import SettingsRow, NoteDigest, NewNote, ClusterInput
from againpage.queue.queue import Queue
from againpage.pipeline.reindex import run_reindex


class FakeProvider:
    def __init__(self, dim=768):
        self.dim = dim
    async def summarize(self, title, body, *, model):
        return NoteDigest(substantive=True, summary=f"sum:{title}", tags=["t"])
    async def embed(self, text, *, model, task="clustering"):
        return [0.1] * self.dim
    async def generate(self, *a, **k): ...
    async def health(self, *, models): ...


class FakeQueue:
    """Minimal queue for run_reindex — only is_cancelled is used. cancel_after
    None → never cancelled; 0 → cancelled on the first check."""
    def __init__(self, cancel_after=None):
        self.calls = 0
        self.cancel_after = cancel_after
    async def is_cancelled(self, job_id):
        self.calls += 1
        return self.cancel_after is not None and self.calls > self.cancel_after


def _settings(uid, vault):
    return SettingsRow(user_id=uid, vault_paths=[vault], excluded_paths=[], profile_text=None,
        cadence_days=1, delivery_time=time(7), reading_min=5, notes_per_issue=3, provider="openrouter",
        ollama_endpoint="", embed_model="e", summary_model="s", writer_model="w")


async def _repo():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return Repository(pool)


async def test_reindex_stages_then_swaps(tmp_path: Path):
    (tmp_path / "a.md").write_text("# A\nalpha")
    (tmp_path / "b.md").write_text("# B\nbeta")
    repo = await _repo(); uid = await repo.ensure_local_user()
    result = await run_reindex(repo=repo, provider=FakeProvider(), queue=FakeQueue(),
        settings=_settings(uid, str(tmp_path)), job_id=uuid4())
    assert result == "done"
    notes = await repo.active_notes(uid)
    assert {n.vault_path.split("/")[-1] for n in notes} == {"a.md", "b.md"}
    assert all(n.summary and n.summary.startswith("sum:") for n in notes)
    assert len(await repo.themes(uid)) >= 1


async def test_cancel_midway_leaves_old_data_intact(tmp_path: Path):
    (tmp_path / "new.md").write_text("# New\nfresh")
    repo = await _repo(); uid = await repo.ensure_local_user()
    # Pre-existing (old) note + theme that must survive a cancelled re-index.
    old = await repo.upsert_note(NewNote(user_id=uid, vault_path="/old.md", title="Old",
        content_hash="h", substantive=True, summary="OLD SUMMARY", tags=["t"], embedding=[0.9] * 768))
    await repo.replace_clustering(uid, [ClusterInput(label="OLD THEME", centroid=[0.9] * 768,
        membership_hash="m", member_ids=[old.id], weights={old.id: 1.0}, last_visited_at=None)])

    result = await run_reindex(repo=repo, provider=FakeProvider(), queue=FakeQueue(cancel_after=0),
        settings=_settings(uid, str(tmp_path)), job_id=uuid4())

    assert result == "cancelled"
    notes = await repo.active_notes(uid)
    assert [n.vault_path for n in notes] == ["/old.md"]               # new.md never ingested
    assert notes[0].summary == "OLD SUMMARY"                          # old data untouched
    themes = await repo.themes(uid)
    assert len(themes) == 1 and themes[0].label == "OLD THEME"        # old theme prevails


async def test_reindex_adapts_to_a_new_embedding_dimension(tmp_path: Path):
    (tmp_path / "a.md").write_text("# A\nalpha")
    (tmp_path / "b.md").write_text("# B\nbeta")
    repo = await _repo(); uid = await repo.ensure_local_user()
    assert await repo.embedding_dim() == 768
    result = await run_reindex(repo=repo, provider=FakeProvider(dim=1536), queue=FakeQueue(),
        settings=_settings(uid, str(tmp_path)), job_id=uuid4())
    assert result == "done"
    assert await repo.embedding_dim() == 1536
    notes = await repo.active_notes(uid)
    assert all(n.embedding is not None and len(n.embedding) == 1536 for n in notes)
