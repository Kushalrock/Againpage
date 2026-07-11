from datetime import date, datetime, time, timezone
from uuid import uuid4
from againpage.core.models import SettingsRow
from againpage.scheduler.scheduler import Scheduler

def _s(cadence_days=1, dtime=time(7), tz="UTC"):
    return SettingsRow(user_id=uuid4(), vault_paths=["/v"], excluded_paths=[], profile_text=None,
        cadence_days=cadence_days, delivery_time=dtime, reading_min=5, notes_per_issue=3,
        provider="openrouter", ollama_endpoint="", embed_model=None, summary_model=None, writer_model=None,
        timezone=tz)

def _now(y, mo, d, h): return datetime(y, mo, d, h, 0, tzinfo=timezone.utc)

def test_first_issue_due_after_delivery_time():
    sched = Scheduler(repo=None, queue=None)
    assert sched.is_due(_s(dtime=time(7)), now=_now(2026,6,30,8), last_issue_date=None) is True
    assert sched.is_due(_s(dtime=time(7)), now=_now(2026,6,30,6), last_issue_date=None) is False

def test_daily_not_due_same_day():
    sched = Scheduler(repo=None, queue=None)
    assert sched.is_due(_s(1), now=_now(2026,6,30,8), last_issue_date=date(2026,6,30)) is False
    assert sched.is_due(_s(1), now=_now(2026,7,1,8), last_issue_date=date(2026,6,30)) is True

def test_weekly_gap():
    sched = Scheduler(repo=None, queue=None)
    assert sched.is_due(_s(7), now=_now(2026,7,5,8), last_issue_date=date(2026,6,30)) is False
    assert sched.is_due(_s(7), now=_now(2026,7,8,8), last_issue_date=date(2026,6,30)) is True

from datetime import timedelta

def test_next_due_first_edition_today_vs_tomorrow():
    sched = Scheduler(repo=None, queue=None)
    # before delivery → today at delivery (timezone-aware; UTC settings → +00:00)
    nd = sched.next_due(_s(dtime=time(7)), now=_now(2026,6,30,2), last_issue_date=None)
    assert nd == datetime(2026,6,30,7,0, tzinfo=timezone.utc)
    # after delivery, no issue yet → still today's delivery (it is due now / being composed)
    nd = sched.next_due(_s(dtime=time(7)), now=_now(2026,6,30,9), last_issue_date=None)
    assert nd == datetime(2026,6,30,7,0, tzinfo=timezone.utc)

def test_next_due_subsequent_uses_cadence_gap():
    sched = Scheduler(repo=None, queue=None)
    nd = sched.next_due(_s(1, time(7)), now=_now(2026,6,30,9), last_issue_date=date(2026,6,30))
    assert nd == datetime(2026,7,1,7,0, tzinfo=timezone.utc)  # daily → tomorrow
    nd = sched.next_due(_s(7, time(8)), now=_now(2026,6,30,9), last_issue_date=date(2026,6,30))
    assert nd == datetime(2026,7,7,8,0, tzinfo=timezone.utc)  # weekly → +7 days

def test_timezone_evaluates_delivery_in_the_users_local_zone():
    # The exact bug we hit: the server's `now` is UTC, the user is in
    # Asia/Kolkata (UTC+5:30) with delivery 07:00 *local*. 01:00 UTC = 06:30 IST
    # (before delivery → not due); 02:00 UTC = 07:30 IST (after → due).
    sched = Scheduler(repo=None, queue=None)
    s = _s(dtime=time(7), tz="Asia/Kolkata")
    assert sched.is_due(s, now=_now(2026,6,30,1), last_issue_date=None) is False
    assert sched.is_due(s, now=_now(2026,6,30,2), last_issue_date=None) is True

def test_next_due_carries_the_local_utc_offset():
    # next_due is timezone-aware so the reader parses an absolute instant, not a
    # naive string it would misread as its own local time.
    sched = Scheduler(repo=None, queue=None)
    nd = sched.next_due(_s(dtime=time(7), tz="Asia/Kolkata"), now=_now(2026,6,30,2), last_issue_date=None)
    assert nd.utcoffset() == timedelta(hours=5, minutes=30)
    assert nd.isoformat() == "2026-06-30T07:00:00+05:30"

def test_unknown_timezone_falls_back_to_utc_without_crashing():
    sched = Scheduler(repo=None, queue=None)
    s = _s(dtime=time(7), tz="Not/AZone")
    assert sched.is_due(s, now=_now(2026,6,30,8), last_issue_date=None) is True

class _FakeRepo:
    def __init__(self, themes, settings, latest): self._t=themes; self._s=settings; self._l=latest
    async def ensure_local_user(self): return "u"
    async def get_settings(self, uid): return self._s
    async def themes(self, uid): return self._t
    async def latest_issue(self, uid): return self._l

class _FakeQueue:
    def __init__(self): self.enqueued=[]
    async def enqueue(self, type, payload, **k): self.enqueued.append(type); return "j"

async def test_tick_skips_generate_when_no_themes():
    q=_FakeQueue()
    sched=Scheduler(repo=_FakeRepo(themes=[], settings=_s(), latest=None), queue=q)
    fired = await sched.tick(now=_now(2026,6,30,9))
    assert fired is False and q.enqueued == []

async def test_tick_enqueues_generate_when_themes_and_due():
    q=_FakeQueue()
    sched=Scheduler(repo=_FakeRepo(themes=["t"], settings=_s(), latest=None), queue=q)
    fired = await sched.tick(now=_now(2026,6,30,9))
    assert fired is True and q.enqueued == ["generate"]
