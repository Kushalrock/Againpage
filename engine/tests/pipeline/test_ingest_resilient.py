import pytest
from againpage.pipeline import ingest
from againpage.core.models import NoteDigest

class _Repo:
    async def note_by_path(self, uid, p): return None
    async def upsert_note(self, note): return type("N", (), {"id": "n"})()
    async def replace_links(self, nid, edges): return None
    async def deactivate_missing(self, uid, seen): return 0

class _Provider:
    def __init__(self, bad): self.bad = bad
    async def summarize(self, title, body, *, model):
        if self.bad in body: raise RuntimeError("boom")
        return NoteDigest(substantive=True, summary="s", tags=["t"])
    async def embed(self, text, *, model, task="clustering"): return [0.1, 0.2]

async def test_one_bad_note_is_counted_not_fatal(tmp_path, monkeypatch):
    good = tmp_path / "good.md"; good.write_text("fine note")
    bad = tmp_path / "bad.md"; bad.write_text("BOOMY note")
    monkeypatch.setattr(ingest.scan, "scan_vaults", lambda roots, *, excluded: [str(good), str(bad)])
    from types import SimpleNamespace
    s = SimpleNamespace(excluded_paths=[], summary_model="", embed_model="", user_id="u")
    counts = await ingest.ingest_vault(["/v"], repo=_Repo(), provider=_Provider("BOOMY"),
                                       settings=s, user_id="u")
    assert counts["scanned"] == 2
    assert counts["failed"] == 1
    assert counts["ingested"] == 1     # the good note still processed
