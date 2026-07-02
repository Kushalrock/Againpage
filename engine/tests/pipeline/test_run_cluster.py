import os
from datetime import time
from uuid import uuid4
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewNote, SettingsRow, NoteDigest
from againpage.pipeline.cluster import run_cluster

class LabelProvider:
    async def summarize(self, title, body, *, model):
        return NoteDigest(substantive=True, summary="Auto Label", tags=[])
    async def embed(self, *a, **k): ...
    async def generate(self, *a, **k): ...
    async def health(self, *, models): ...

def _settings(uid):
    return SettingsRow(user_id=uid, vault_path="/v", excluded_paths=[], profile_text=None,
        cadence="daily", delivery_time=time(7), reading_min=5, notes_per_issue=3,
        provider="openrouter", ollama_endpoint="", embed_model="e", summary_model="s", writer_model="w")

async def test_run_cluster_populates_themes():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool); uid = await repo.ensure_local_user()
    for i in range(8):
        base = 0.0 if i < 4 else 10.0
        await repo.upsert_note(NewNote(user_id=uid, vault_path=f"n{i}.md", title=f"N{i}",
            content_hash="h", substantive=True, summary="s", tags=["t"],
            embedding=[base + (i % 2) * 0.01] * 768))
    written = await run_cluster(uid, repo=repo, provider=LabelProvider(), settings=_settings(uid))
    themes = await repo.themes(uid)
    assert written >= 1 and all(t.label == "Auto Label" for t in themes)
