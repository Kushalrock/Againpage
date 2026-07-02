from __future__ import annotations
import random as _random
from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID
from againpage.storage.repository import Repository
from againpage.providers.base import Provider
from againpage.core.models import SettingsRow, NewIssue
from againpage.core.selection import select
from againpage.generation.payload import build_payload, word_target
from againpage.generation.writer import compose_issue

def _default_read(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""

async def run_generate(user_id: UUID, *, repo: Repository, provider: Provider,
                       settings: SettingsRow, now: date, rng: _random.Random | None = None,
                       read_note_text=None) -> UUID:
    rng = rng or _random.Random()
    read_note_text = read_note_text or _default_read
    ctx = await repo.build_selection_context(user_id)
    now_dt = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    selection = select(ctx, now=now_dt, rng=rng)
    issue_no = await repo.next_issue_no(user_id)
    payload = build_payload(selection, reading_min=settings.reading_min,
        profile=settings.profile_text or "", read_note_text=read_note_text,
        date=now.isoformat(), issue_no=issue_no)
    issue = await compose_issue(payload, provider,
        writer_model=settings.writer_model or "anthropic/claude-sonnet-4.6")
    row = await repo.insert_issue(NewIssue(user_id=user_id, issue_no=issue_no, issue_date=now,
        theme_id=selection.theme_id, theme_label=selection.theme_label,
        reading_min=settings.reading_min, word_target=word_target(settings.reading_min),
        content=issue.model_dump(), payload=payload, model=settings.writer_model))
    # Stage 6: seen-history
    await repo.record_issue_notes(row.id, selection.records)
    if selection.theme_id:
        await repo.touch_theme_visited(selection.theme_id, now)
    for c in selection.connections:
        if c.flavor == "reminder":
            await repo.touch_link_seen(selection.anchor.note_id, c.note.note_id, now)
    return row.id
