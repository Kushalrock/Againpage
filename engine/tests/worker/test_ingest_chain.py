import os
from datetime import time
from uuid import uuid4
from pathlib import Path
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import SettingsRow, NoteDigest
from againpage.queue.queue import Queue, Job
from againpage.worker.loop import handle_ingest

class FakeProvider:
    async def summarize(self, title, body, *, model): return NoteDigest(substantive=True, summary=f"s:{title}", tags=["t"])
    async def embed(self, text, *, model, task="clustering"): return [0.1]*768
    async def generate(self, *a, **k): ...
    async def health(self, *, models): ...

def _settings(uid, vault): return SettingsRow(user_id=uid, vault_paths=[vault], excluded_paths=[], profile_text=None,
    cadence_days=1, delivery_time=time(7), reading_min=5, notes_per_issue=3, provider="openrouter",
    ollama_endpoint="", embed_model="e", summary_model="s", writer_model="w")

async def _fresh():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return pool

async def test_full_vault_ingest_chains_a_cluster_job(tmp_path: Path):
    (tmp_path/"a.md").write_text("# A\nidea one")
    pool = await _fresh(); repo = Repository(pool); queue = Queue(pool); uid = await repo.ensure_local_user()
    job = Job(id=uuid4(), type="ingest", payload={}, attempts=1)   # full-vault (no path)
    await handle_ingest(job, repo=repo, provider=FakeProvider(), queue=queue, settings=_settings(uid, str(tmp_path)))
    assert len(await repo.active_notes(uid)) == 1
    claimed = await queue.claim()
    assert claimed is not None and claimed.type == "cluster"       # cluster chained

async def test_unchanged_vault_ingest_does_not_chain_cluster(tmp_path: Path):
    # A watcher/periodic tick that finds nothing changed must not re-cluster.
    (tmp_path/"a.md").write_text("# A\nidea one")
    pool = await _fresh(); repo = Repository(pool); queue = Queue(pool); uid = await repo.ensure_local_user()
    s = _settings(uid, str(tmp_path))
    # First ingest: new note → chains a cluster.
    await handle_ingest(Job(id=uuid4(), type="ingest", payload={}, attempts=1),
                        repo=repo, provider=FakeProvider(), queue=queue, settings=s)
    first = await queue.claim()
    assert first is not None and first.type == "cluster"
    await queue.complete(first.id)
    # Second ingest, nothing changed (same content hash) → NO cluster chained.
    await handle_ingest(Job(id=uuid4(), type="ingest", payload={}, attempts=1),
                        repo=repo, provider=FakeProvider(), queue=queue, settings=s)
    assert await queue.claim() is None

async def test_single_path_ingest_does_not_chain(tmp_path: Path):
    f = tmp_path/"a.md"; f.write_text("# A\nidea")
    pool = await _fresh(); repo = Repository(pool); queue = Queue(pool); uid = await repo.ensure_local_user()
    job = Job(id=uuid4(), type="ingest", payload={"path": str(f)}, attempts=1)
    await handle_ingest(job, repo=repo, provider=FakeProvider(), queue=queue, settings=_settings(uid, str(tmp_path)))
    assert await queue.claim() is None                              # no cluster job
