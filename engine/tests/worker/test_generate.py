import os
from datetime import time
from uuid import uuid4
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import SettingsRow
from againpage.queue.queue import Queue, Job
from againpage.worker.loop import handle_generate

VALID = {"title":"Composed","dek":"d","standfirst":"s","sources":["a"],"lead":"x",
    "connections":[],"standalone_summaries":[],"questions":[],"apply":[],"wildcard":None,"forgotten":None}

class FakeProvider:
    async def generate(self, payload, *, model): return VALID
    async def summarize(self, *a, **k): ...
    async def embed(self, *a, **k): ...
    async def health(self, *, models): ...

def _settings(uid) -> SettingsRow:
    return SettingsRow(user_id=uid, vault_path=None, excluded_paths=[], profile_text=None,
        cadence_days=1, delivery_time=time(7), reading_min=7, notes_per_issue=3,
        provider="openrouter", ollama_endpoint="", embed_model=None,
        summary_model=None, writer_model="anthropic/claude-sonnet-4.6")

async def test_handle_generate_stores_issue():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool)
    uid = await repo.ensure_local_user()
    job = Job(id=uuid4(), type="generate", payload={}, attempts=1)  # empty → use fixture payload
    await handle_generate(job, repo=repo, provider=FakeProvider(), settings=_settings(uid))
    latest = await repo.latest_issue(uid)
    assert latest.content["title"] == "Composed"
    assert latest.payload is not None  # exact payload stored (confabulation audit)
