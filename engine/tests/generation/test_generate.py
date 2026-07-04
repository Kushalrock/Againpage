import os, random
from datetime import date, time
from uuid import uuid4
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewNote, SettingsRow, ClusterInput
from againpage.generation.generate import run_generate

VALID = {"title":"Amor Fati","dek":"d","standfirst":"s","sources":["Amor Fati"],"lead":"x",
    "connections":[],"standalone_summaries":[],"questions":[],"apply":[],"wildcard":None,"forgotten":None}

class FakeProvider:
    async def generate(self, payload, *, model):
        assert payload["anchor"]["text"]        # full text reached the writer
        return VALID
    async def summarize(self, *a, **k): ...
    async def embed(self, *a, **k): ...
    async def health(self, *, models): ...

def _settings(uid):
    return SettingsRow(user_id=uid, vault_path="/v", excluded_paths=[], profile_text="prof",
        cadence_days=1, delivery_time=time(7), reading_min=7, notes_per_issue=3,
        provider="openrouter", ollama_endpoint="", embed_model="e", summary_model="s",
        writer_model="anthropic/claude-sonnet-4.6")

async def test_run_generate_produces_issue_and_seen_history():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool); uid = await repo.ensure_local_user()
    ids = []
    for i in range(3):
        n = await repo.upsert_note(NewNote(user_id=uid, vault_path=f"/v/n{i}.md", title=f"N{i}",
            content_hash="h", substantive=True, summary="s", tags=["t"], embedding=[float(i)+0.1]*768))
        ids.append(n.id)
    await repo.replace_clustering(uid, [ClusterInput(label="Stoicism", centroid=[1.1]*768,
        membership_hash="h1", member_ids=ids, weights={i: 1.0 for i in ids})])
    issue_id = await run_generate(uid, repo=repo, provider=FakeProvider(), settings=_settings(uid),
        now=date(2026, 6, 30), rng=random.Random(1), read_note_text=lambda p: f"FULL TEXT of {p}")
    latest = await repo.latest_issue(uid)
    assert latest.id == issue_id and latest.payload is not None
    surfaced = await repo.last_surfaced(uid)
    assert len(surfaced) >= 1   # Stage-6 seen-history written


async def test_run_generate_cancelled_saves_no_issue():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN), open=False); await pool.open()
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool); uid = await repo.ensure_local_user()
    ids = []
    for i in range(3):
        n = await repo.upsert_note(NewNote(user_id=uid, vault_path=f"/v/n{i}.md", title=f"N{i}",
            content_hash="h", substantive=True, summary="s", tags=["t"], embedding=[float(i)+0.1]*768))
        ids.append(n.id)
    await repo.replace_clustering(uid, [ClusterInput(label="Stoicism", centroid=[1.1]*768,
        membership_hash="h1", member_ids=ids, weights={i: 1.0 for i in ids})])

    async def always_cancel():
        return True

    result = await run_generate(uid, repo=repo, provider=FakeProvider(), settings=_settings(uid),
        now=date(2026, 6, 30), rng=random.Random(1), read_note_text=lambda p: "x", cancelled=always_cancel)
    assert result is None
    assert await repo.latest_issue(uid) is None    # cancelled → nothing persisted
