from __future__ import annotations
from datetime import date, datetime, timedelta
from againpage.core.models import SettingsRow

_MIN_GAP = {"daily": 1, "few_days": 3, "weekly": 7, "biweekly": 14}

class Scheduler:
    def __init__(self, repo, queue):
        self.repo = repo
        self.queue = queue

    def is_due(self, settings: SettingsRow, *, now: datetime, last_issue_date: date | None) -> bool:
        if now.time() < settings.delivery_time:
            return False
        if last_issue_date is None:
            return True
        gap = _MIN_GAP.get(settings.cadence, 1)
        return (now.date() - last_issue_date).days >= gap

    def next_due(self, settings: SettingsRow, *, now: datetime, last_issue_date: date | None) -> datetime:
        dt = settings.delivery_time
        if last_issue_date is None:
            d = now.date()
        else:
            d = last_issue_date + timedelta(days=_MIN_GAP.get(settings.cadence, 1))
        return datetime(d.year, d.month, d.day, dt.hour, dt.minute)

    async def tick(self, *, now: datetime) -> bool:
        uid = await self.repo.ensure_local_user()
        settings = await self.repo.get_settings(uid)
        if settings is None or not settings.vault_path:
            return False
        if not await self.repo.themes(uid):        # gate: only auto-generate once indexed
            return False
        latest = await self.repo.latest_issue(uid)
        last_date = latest.issue_date if latest else None
        if self.is_due(settings, now=now, last_issue_date=last_date):
            await self.queue.enqueue("generate", {})
            return True
        return False
