import os
from datetime import date
from fastapi.testclient import TestClient
from anyio.from_thread import start_blocking_portal
from againpage.storage import db, migrate
from againpage.storage.repository import Repository
from againpage.core.models import NewNote, NewIssue, ClusterInput
from againpage.api.app import create_app

async def _prep():
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    async with pool.connection() as conn:
        await conn.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
    await migrate.apply(pool)
    repo = Repository(pool); await repo.ensure_local_user()
    return repo

def test_status_and_reindex():
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        uid = portal.call(repo.ensure_local_user)
        app = create_app(repo)
        client = TestClient(app)
        client.portal = portal
        # fresh: not indexed, reindex 409 (no vault yet)
        s0 = client.get("/status").json()
        assert s0["indexed"] is False and s0["theme_count"] == 0 and s0["next_edition_at"] is None
        assert client.post("/reindex").status_code == 409
        # set a vault + index one note + a theme → indexed, reindex enqueues, next_edition_at set
        portal.call(repo.upsert_settings, uid, {"vault_paths": ["/v"]})
        n = portal.call(repo.upsert_note, NewNote(user_id=uid, vault_path="a.md", title="A",
            content_hash="h", substantive=True, summary="s", tags=["t"], embedding=[0.1]*768))
        portal.call(repo.replace_clustering, uid, [ClusterInput(label="T", centroid=[0.1]*768,
            membership_hash="h1", member_ids=[n.id], weights={n.id: 1.0})])
        s1 = client.get("/status").json()
        assert s1["indexed"] is True and s1["theme_count"] == 1 and s1["note_count"] == 1
        assert s1["next_edition_at"] is not None and s1["delivery_time"] == "07:00"
        assert client.post("/reindex").json()["job_id"]


def test_active_jobs_reported_and_cancellable():
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        uid = portal.call(repo.ensure_local_user)
        portal.call(repo.upsert_settings, uid, {"vault_paths": ["/v"]})
        app = create_app(repo)
        client = TestClient(app); client.portal = portal
        assert client.get("/status").json()["active_jobs"] == []
        assert client.post("/trigger").json()["job_id"]                 # enqueue a generate job
        assert "generate" in client.get("/status").json()["active_jobs"]
        assert client.post("/jobs/cancel?type=generate").json()["cancelled"] >= 1
        assert "generate" not in client.get("/status").json()["active_jobs"]


def test_reindex_force_flag_enqueues_force_payload():
    from againpage.queue.queue import Queue
    with start_blocking_portal() as portal:
        repo = portal.call(_prep)
        uid = portal.call(repo.ensure_local_user)
        portal.call(repo.upsert_settings, uid, {"vault_paths": ["/v"]})
        app = create_app(repo)
        client = TestClient(app); client.portal = portal
        q = Queue(repo.pool)
        assert client.post("/reindex?force=true").json()["job_id"]
        job = portal.call(q.claim)
        assert job.type == "ingest" and job.payload == {"force": True}
        assert client.post("/reindex").json()["job_id"]        # default: no force
        assert portal.call(q.claim).payload == {}
