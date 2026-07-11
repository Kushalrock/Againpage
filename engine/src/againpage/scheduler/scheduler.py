from __future__ import annotations
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo
from againpage.core.models import SettingsRow

_UTC = ZoneInfo("UTC")


class Scheduler:
    def __init__(self, repo, queue):
        self.repo = repo
        self.queue = queue

    def _local(self, settings: SettingsRow, now: datetime) -> datetime:
        """`now` converted to the user's timezone (a naive `now` is treated as
        UTC). delivery_time and the cadence day-gap are then evaluated against
        the user's local wall clock — correct even when the server (e.g. a Docker
        container) runs in UTC. An unknown tz name falls back to UTC rather than
        crashing the scheduler tick."""
        if now.tzinfo is None:
            now = now.replace(tzinfo=_UTC)
        try:
            tz = ZoneInfo(settings.timezone or "UTC")
        except Exception:  # noqa: BLE001
            tz = _UTC
        return now.astimezone(tz)

    def is_due(self, settings: SettingsRow, *, now: datetime, last_issue_date: date | None) -> bool:
        local = self._local(settings, now)
        if local.time() < settings.delivery_time:
            return False
        if last_issue_date is None:
            return True
        gap = max(1, settings.cadence_days)
        return (local.date() - last_issue_date).days >= gap

    def next_due(self, settings: SettingsRow, *, now: datetime, last_issue_date: date | None) -> datetime:
        local = self._local(settings, now)
        dt = settings.delivery_time
        if last_issue_date is None:
            d = local.date()
        else:
            d = last_issue_date + timedelta(days=max(1, settings.cadence_days))
        # Timezone-aware so `.isoformat()` carries the offset (e.g. +05:30); the
        # reader then parses it as an absolute instant instead of mis-reading a
        # naive string as the device's own local time.
        return datetime(d.year, d.month, d.day, dt.hour, dt.minute, tzinfo=local.tzinfo)

    async def tick(self, *, now: datetime) -> bool:
        uid = await self.repo.ensure_local_user()
        settings = await self.repo.get_settings(uid)
        if settings is None or not settings.vault_paths:
            return False
        if not await self.repo.themes(uid):        # gate: only auto-generate once indexed
            return False
        latest = await self.repo.latest_issue(uid)
        last_date = latest.issue_date if latest else None
        if self.is_due(settings, now=now, last_issue_date=last_date):
            await self.queue.enqueue("generate", {})
            return True
        return False
