import os
from datetime import time
from pathlib import Path
from uuid import uuid4
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import SettingsRow, NoteDigest
from againpage.pipeline.ingest import ingest_vault, ingest_file, content_hash

class FakeProvider:
    async def summarize(self, title, body, *, model):
        substantive = "stub" not in body.lower()
        return NoteDigest(substantive=substantive, summary=f"sum:{title}", tags=["t"])
    async def embed(self, text, *, model, task="clustering"): return [0.1]*768
    async def generate(self, *a, **k): ...
    async def health(self, *, models): ...

def _settings(uid, vault) -> SettingsRow:
    return SettingsRow(user_id=uid, vault_path=vault, excluded_paths=[], profile_text=None,
        cadence="daily", delivery_time=time(7), reading_min=5, notes_per_issue=3,
        provider="openrouter", ollama_endpoint="", embed_model="e", summary_model="s", writer_model="w")

async def _repo():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    return Repository(pool)

async def test_bulk_ingest_populates_notes_and_links(tmp_path: Path):
    (tmp_path / "amor.md").write_text("# Amor Fati\nLoving fate. See [[Control]].")
    (tmp_path / "Control.md").write_text("# Control\nEpictetus dichotomy.")
    (tmp_path / "stub.md").write_text("stub note, nothing here")
    repo = await _repo(); uid = await repo.ensure_local_user()
    counts = await ingest_vault(str(tmp_path), repo=repo, provider=FakeProvider(),
                                settings=_settings(uid, str(tmp_path)), user_id=uid)
    active = {n.vault_path.split("/")[-1]: n for n in await repo.active_notes(uid)}
    assert "amor.md" in active and "Control.md" in active
    assert "stub.md" not in active  # non-substantive not surfaced as active/substantive
    assert active["amor.md"].summary == "sum:Amor Fati"

async def test_content_hash_gate_skips_unchanged(tmp_path: Path):
    f = tmp_path / "a.md"; f.write_text("# A\nbody")
    repo = await _repo(); uid = await repo.ensure_local_user()
    s = _settings(uid, str(tmp_path))
    r1 = await ingest_file(str(f), repo=repo, provider=FakeProvider(), settings=s, user_id=uid)
    r2 = await ingest_file(str(f), repo=repo, provider=FakeProvider(), settings=s, user_id=uid)
    assert r1 == "ingested" and r2 == "skipped"
