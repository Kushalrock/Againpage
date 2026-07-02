from datetime import date, datetime, time, timezone
from uuid import uuid4
from againpage.core.models import SettingsRow
from againpage.scheduler.scheduler import Scheduler

def _s(cadence="daily", dtime=time(7)):
    return SettingsRow(user_id=uuid4(), vault_path="/v", excluded_paths=[], profile_text=None,
        cadence=cadence, delivery_time=dtime, reading_min=5, notes_per_issue=3,
        provider="openrouter", ollama_endpoint="", embed_model=None, summary_model=None, writer_model=None)

def _now(y, mo, d, h): return datetime(y, mo, d, h, 0, tzinfo=timezone.utc)

def test_first_issue_due_after_delivery_time():
    sched = Scheduler(repo=None, queue=None)
    assert sched.is_due(_s(dtime=time(7)), now=_now(2026,6,30,8), last_issue_date=None) is True
    assert sched.is_due(_s(dtime=time(7)), now=_now(2026,6,30,6), last_issue_date=None) is False

def test_daily_not_due_same_day():
    sched = Scheduler(repo=None, queue=None)
    assert sched.is_due(_s("daily"), now=_now(2026,6,30,8), last_issue_date=date(2026,6,30)) is False
    assert sched.is_due(_s("daily"), now=_now(2026,7,1,8), last_issue_date=date(2026,6,30)) is True

def test_weekly_gap():
    sched = Scheduler(repo=None, queue=None)
    assert sched.is_due(_s("weekly"), now=_now(2026,7,5,8), last_issue_date=date(2026,6,30)) is False
    assert sched.is_due(_s("weekly"), now=_now(2026,7,8,8), last_issue_date=date(2026,6,30)) is True
