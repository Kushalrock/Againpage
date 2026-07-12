import pytest
from againpage.worker.loop import handle_ingest
from againpage.queue.queue import Job
from againpage.core.models import NoteDigest
from types import SimpleNamespace

class _Repo:
    def __init__(self): self.state = None
    async def note_by_path(self, uid, p): return None
    async def upsert_note(self, n): return SimpleNamespace(id="n")
    async def replace_links(self, nid, e): return None
    async def deactivate_missing(self, uid, seen): return 0
    async def ensure_embedding_dim(self, d): return False
    async def set_sync_state(self, uid, *, scanned, synced, failed):
        self.state = (scanned, synced, failed)

class _Q:
    def __init__(self): self.enq = []
    async def is_cancelled(self, jid): return False
    async def enqueue(self, t, p, **k): self.enq.append(t)

class _Prov:
    async def summarize(self, t, b, *, model): return NoteDigest(substantive=False, summary="", tags=[])
    async def embed(self, x, *, model, task="clustering"): return [0.1, 0.2]

async def test_cheap_ingest_records_sync_state(tmp_path, monkeypatch):
    from againpage.pipeline import ingest
    n = tmp_path / "a.md"; n.write_text("x")
    monkeypatch.setattr(ingest.scan, "scan_vaults", lambda roots, *, excluded: [str(n)])
    repo, q = _Repo(), _Q()
    s = SimpleNamespace(vault_paths=["/v"], excluded_paths=[], summary_model="", embed_model="", user_id="u")
    await handle_ingest(Job(id="j", type="ingest", payload={}, attempts=1),
                        repo=repo, provider=_Prov(), queue=q, settings=s)
    assert repo.state == (1, 1, 0)      # scanned 1, synced 1, failed 0
    assert "cluster" in q.enq
