from __future__ import annotations
import asyncio
from datetime import date, datetime, timedelta
from againpage.core.models import SettingsRow, NewIssue
from againpage.queue.queue import Queue, Job
from againpage.storage.repository import Repository
from againpage.providers.base import Provider
from againpage.generation.writer import compose_issue
from againpage.generation.payload import manual_payload, word_target
from againpage.generation.generate import run_generate
from againpage.pipeline.ingest import ingest_file, ingest_vault
from againpage.pipeline.cluster import run_cluster
from againpage.scheduler.scheduler import Scheduler

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

async def handle_generate(job: Job, *, repo: Repository, provider: Provider, settings: SettingsRow) -> None:
    payload = job.payload or {}
    if not payload.get("theme"):
        payload = fixture_payload(settings)
    issue = await compose_issue(payload, provider, writer_model=settings.writer_model or "anthropic/claude-sonnet-4.6")
    no = await repo.next_issue_no(settings.user_id)
    await repo.insert_issue(NewIssue(
        user_id=settings.user_id, issue_no=no, issue_date=date.today(), theme_id=None,
        theme_label=issue.title, reading_min=settings.reading_min,
        word_target=word_target(settings.reading_min), content=issue.model_dump(),
        payload=payload, model=settings.writer_model))

async def run_worker(pool, make_provider) -> None:  # pragma: no cover (loop)
    queue = Queue(pool)
    repo = Repository(pool)
    scheduler = Scheduler(repo, queue)
    last_tick = 0.0
    while True:
        job = await queue.claim()
        if job is None:
            await asyncio.sleep(1.0); continue
        try:
            settings = await repo.get_settings(await repo.ensure_local_user())
            provider = make_provider(settings)
            if job.type == "generate":
                themes = await repo.themes(settings.user_id)
                if themes:
                    await run_generate(settings.user_id, repo=repo, provider=provider,
                                       settings=settings, now=date.today())
                else:
                    await handle_generate(job, repo=repo, provider=provider, settings=settings)
            elif job.type == "ingest":
                path = job.payload.get("path")
                if path:
                    await ingest_file(path, repo=repo, provider=provider, settings=settings, user_id=settings.user_id)
                elif settings.vault_path:
                    await ingest_vault(settings.vault_path, repo=repo, provider=provider,
                                       settings=settings, user_id=settings.user_id)
            elif job.type == "cluster":
                await run_cluster(settings.user_id, repo=repo, provider=provider, settings=settings)
            await queue.complete(job.id)
        except Exception:  # noqa: BLE001
            await queue.fail(job.id, retry_in=timedelta(seconds=min(60, 2 ** job.attempts)))
        import time as _t
        if _t.monotonic() - last_tick > 60:
            last_tick = _t.monotonic()
            # Local (naive) now: delivery_time is the user's local wall-clock, and the
            # cadence day-gap is measured in the user's local days — not UTC.
            await scheduler.tick(now=datetime.now())

def main() -> None:  # pragma: no cover
    import os
    from againpage.storage import db, migrate
    from againpage.providers.factory import make_provider
    dsn = os.environ.get("DATABASE_URL", db.DEFAULT_DSN)

    async def _amain() -> None:
        pool = db.make_pool(dsn, open=False)
        await pool.open()
        await migrate.apply(pool)
        await run_worker(pool, make_provider)

    asyncio.run(_amain())

if __name__ == "__main__":
    main()
