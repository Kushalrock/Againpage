from __future__ import annotations
import asyncio
from datetime import date, timedelta
from againpage.core.models import SettingsRow, NewIssue
from againpage.queue.queue import Queue, Job
from againpage.storage.repository import Repository
from againpage.providers.base import Provider
from againpage.generation.writer import compose_issue
from againpage.generation.payload import manual_payload, word_target

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
    while True:
        job = await queue.claim()
        if job is None:
            await asyncio.sleep(1.0); continue
        try:
            settings = await repo.get_settings(await repo.ensure_local_user())
            provider = make_provider(settings)
            if job.type == "generate":
                await handle_generate(job, repo=repo, provider=provider, settings=settings)
            await queue.complete(job.id)
        except Exception:  # noqa: BLE001
            await queue.fail(job.id, retry_in=timedelta(seconds=min(60, 2 ** job.attempts)))

def main() -> None:  # pragma: no cover
    import os
    from againpage.storage import db, migrate
    from againpage.providers.factory import make_provider
    pool = db.make_pool(os.environ.get("DATABASE_URL", db.DEFAULT_DSN))
    asyncio.run(migrate.apply(pool))
    asyncio.run(run_worker(pool, make_provider))

if __name__ == "__main__":
    main()
