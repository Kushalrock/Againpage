from __future__ import annotations
import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from againpage.core.models import SettingsRow, NewIssue
from againpage.queue.queue import Queue, Job
from againpage.storage.repository import Repository
from againpage.providers.base import Provider
from againpage.generation.writer import compose_issue
from againpage.generation.payload import manual_payload, word_target
from againpage.generation.generate import run_generate
from againpage.pipeline.ingest import ingest_file, ingest_vault
from againpage.pipeline.cluster import run_cluster
from againpage.pipeline.reindex import run_reindex
from againpage.scheduler.scheduler import Scheduler

log = logging.getLogger("againpage.worker")

# A hand-fed M1 payload so `trigger` works before ingest/selection exist.
def fixture_payload(settings: SettingsRow) -> dict:
    return manual_payload(
        reading_minutes=settings.reading_min, theme="Amor Fati",
        anchor={"title": "Amor Fati", "text": "Nietzsche's formula for greatness: to love one's fate…"},
        fresh=[{"title": "The Dichotomy of Control",
                "text": "Epictetus: some things are up to us, some are not…"}],
        connections_found=[{"note": "The Serenity Prayer", "flavor": "reminder",
                            "why": "a compression of the dichotomy of control"}],
        profile=settings.profile_text or "")

async def handle_generate(job: Job, *, repo: Repository, provider: Provider, settings: SettingsRow, cancelled=None) -> None:
    payload = job.payload or {}
    if not payload.get("theme"):
        payload = fixture_payload(settings)
    issue = await compose_issue(payload, provider, writer_model=settings.writer_model or "anthropic/claude-sonnet-4.6")
    if cancelled is not None and await cancelled():   # cancelled during compose → don't save
        return
    no = await repo.next_issue_no(settings.user_id)
    await repo.insert_issue(NewIssue(
        user_id=settings.user_id, issue_no=no, issue_date=date.today(), theme_id=None,
        theme_label=issue.title, reading_min=settings.reading_min,
        word_target=word_target(settings.reading_min), content=issue.model_dump(),
        payload=payload, model=settings.writer_model))

async def handle_ingest(job: Job, *, repo, provider, queue, settings) -> None:
    path = job.payload.get("path")
    if path:
        await ingest_file(path, repo=repo, provider=provider, settings=settings, user_id=settings.user_id)
    elif job.payload.get("force"):
        # Forced re-index (after a model change): compute everything in memory
        # and swap atomically, so a cancel/crash midway leaves the old data
        # intact. Cancellable between notes.
        result = await run_reindex(repo=repo, provider=provider, queue=queue, settings=settings, job_id=job.id)
        log.info("forced re-index: %s", result)
    elif settings.vault_paths:
        # Cheap sync re-index: only changed notes are re-processed (content-hash
        # gate), themes replaced atomically by the chained cluster job. Probe the
        # embedding dimension in case it changed via manual settings.
        async def cancelled() -> bool:
            return await queue.is_cancelled(job.id)
        probe = await provider.embed("dimension probe", model=settings.embed_model or "", task="clustering")
        changed = await repo.ensure_embedding_dim(len(probe))
        if changed:
            log.info("embedding dimension set to %d (re-embedding the whole vault)", len(probe))
        counts = await ingest_vault(settings.vault_paths, repo=repo, provider=provider,
                                    settings=settings, user_id=settings.user_id, cancelled=cancelled)
        if not counts.get("cancelled"):
            await repo.set_sync_state(settings.user_id,
                scanned=counts.get("scanned", 0),
                synced=counts.get("scanned", 0) - counts.get("failed", 0),
                failed=counts.get("failed", 0))
            await queue.enqueue("cluster", {})   # chain a re-cluster after a full-vault ingest

async def run_worker(pool, make_provider) -> None:  # pragma: no cover (loop)
    import time as _t
    from againpage.scheduler.sync import sync_due
    queue = Queue(pool)
    repo = Repository(pool)
    scheduler = Scheduler(repo, queue)
    last_tick = 0.0
    reclaimed = await queue.reclaim_stale()   # recover jobs orphaned by a previous crash/kill
    if reclaimed:
        log.info("requeued %d orphaned job(s) from a previous run", reclaimed)
    log.info("worker ready — polling the job queue (Ctrl+C to stop)")
    # Best-effort file watcher(s) — may not fire on Docker/network FS; the
    # periodic below is the reliable path. Never crash the worker if it fails.
    try:
        s0 = await repo.get_settings(await repo.ensure_local_user())
        if s0 and s0.vault_paths:
            from againpage.vault.watcher import start_watcher
            for vp in s0.vault_paths:
                try:
                    start_watcher(vp, queue)
                except Exception:  # noqa: BLE001
                    log.warning("vault watcher failed to start for %s", vp, exc_info=True)
    except Exception:  # noqa: BLE001
        log.warning("watcher setup skipped", exc_info=True)
    last_sync = _t.monotonic()
    last_check = 0.0
    while True:
        # Scheduler heartbeat — must run every ~60s regardless of queue activity,
        # so scheduled editions fire even when the queue is idle (the normal
        # state). Pass an aware UTC instant; the scheduler converts it to the
        # user's configured timezone, so delivery_time and the cadence day-gap
        # are evaluated against the user's local wall clock even on a UTC server.
        # A tick error must not kill the worker loop.
        if _t.monotonic() - last_tick > 60:
            last_tick = _t.monotonic()
            try:
                await scheduler.tick(now=datetime.now(timezone.utc))
            except Exception:  # noqa: BLE001
                log.exception("scheduler tick failed")

        if _t.monotonic() - last_check > 60:
            last_check = _t.monotonic()
            try:
                s = await repo.get_settings(await repo.ensure_local_user())
                if s and s.vault_paths and sync_due(s.sync_interval_minutes, _t.monotonic() - last_sync):
                    await queue.enqueue("ingest", {})
                    last_sync = _t.monotonic()
            except Exception:  # noqa: BLE001
                log.exception("periodic sync tick failed")

        job = await queue.claim()
        if job is None:
            await asyncio.sleep(1.0); continue
        log.info("job %s: %s — starting", job.id, job.type)

        async def cancelled() -> bool:
            return await queue.is_cancelled(job.id)

        try:
            settings = await repo.get_settings(await repo.ensure_local_user())
            provider = make_provider(settings)
            if job.type == "generate":
                themes = await repo.themes(settings.user_id)
                if themes:
                    await run_generate(settings.user_id, repo=repo, provider=provider,
                                       settings=settings, now=date.today(), cancelled=cancelled)
                else:
                    await handle_generate(job, repo=repo, provider=provider, settings=settings, cancelled=cancelled)
            elif job.type == "ingest":
                await handle_ingest(job, repo=repo, provider=provider, queue=queue, settings=settings)
            elif job.type == "cluster":
                await run_cluster(settings.user_id, repo=repo, provider=provider, settings=settings, cancelled=cancelled)
            await queue.complete(job.id)
            log.info("job %s: %s — done", job.id, job.type)
        except Exception:  # noqa: BLE001
            # Log the real error — otherwise a failing job retries invisibly forever.
            log.exception("job %s: %s — FAILED (attempt %d), will retry", job.id, job.type, job.attempts)
            await queue.fail(job.id, retry_in=timedelta(seconds=min(60, 2 ** job.attempts)))

def main() -> None:  # pragma: no cover
    import os
    from againpage.storage import db, migrate
    from againpage.providers.factory import make_provider
    from againpage.config import load_env
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    loaded = load_env()   # pull DATABASE_URL / provider keys from a .env file if present
    dsn = os.environ.get("DATABASE_URL", db.DEFAULT_DSN)

    async def _amain() -> None:
        if loaded:
            log.info(".env loaded from %s", ", ".join(str(p) for p in loaded))
        # Surface whether provider keys are present (masked) — the #1 cause of
        # ingest/generate failures is a missing OPENROUTER_API_KEY.
        log.info("provider keys: openrouter=%s ollama=%s",
                 "set" if os.environ.get("OPENROUTER_API_KEY") else "MISSING",
                 "set" if os.environ.get("OLLAMA_API_KEY") else "unset (fine for local Ollama)")
        log.info("starting worker (DATABASE_URL=%s)", dsn)
        await db.ensure_vector_extension(dsn)   # fresh DB: create pgvector ext before the pool
        pool = db.make_pool(dsn, open=False)
        await pool.open()
        await migrate.apply(pool)
        log.info("connected to database, migrations applied")
        await run_worker(pool, make_provider)

    asyncio.run(_amain())

if __name__ == "__main__":
    main()
