from __future__ import annotations

def _cfg(minutes: int) -> dict:
    t = max(0.0, min(1.0, (minutes - 3) / 12))
    return {
        "summaries": minutes >= 5, "apply": minutes >= 6,
        "wildcard": minutes >= 11, "forgotten": minutes >= 10,
    }

def word_target(reading_min: int) -> int:
    return round(220 * reading_min)

def build_include(reading_min: int) -> list[str]:
    c = _cfg(reading_min)
    include = ["masthead", "lead", "connections", "questions"]
    if c["summaries"]: include.append("standalone_summaries")
    if c["apply"]: include.append("apply")
    if c["wildcard"]: include.append("wildcard")
    if c["forgotten"]: include.append("forgotten")
    return include

def manual_payload(*, reading_minutes: int, theme: str, anchor: dict, fresh: list[dict],
                   connections_found: list[dict], profile: str = "",
                   wildcard: dict | None = None, forgotten: dict | None = None,
                   date: str | None = None, issue_no: int | None = None) -> dict:
    from againpage.core.models import Payload
    return Payload(
        date=date, issue_no=issue_no, reading_minutes=reading_minutes,
        target_word_count=word_target(reading_minutes), include=build_include(reading_minutes),
        theme=theme, anchor=anchor, fresh=fresh, connections_found=connections_found,
        wildcard=wildcard, forgotten=forgotten, profile=profile).model_dump()

from typing import Callable
from againpage.core.models import Selection

def build_payload(selection: Selection, *, reading_min: int, profile: str,
                  read_note_text: Callable[[str], str], date: str | None = None,
                  issue_no: int | None = None) -> dict:
    anchor = {"title": selection.anchor.title, "text": read_note_text(selection.anchor.vault_path)}
    fresh = [{"title": f.title, "text": read_note_text(f.vault_path)} for f in selection.fresh]
    connections_found = [{"note": c.note.title, "summary": c.note.summary,
                          "flavor": c.flavor, "why": c.why} for c in selection.connections]
    wildcard = None
    if selection.wildcard:
        wildcard = {"note": selection.wildcard.title, "summary": selection.wildcard.summary,
                    "from_theme": selection.wildcard_from_theme}
    forgotten = None
    if selection.forgotten:
        forgotten = {"note": selection.forgotten.title, "summary": selection.forgotten.summary}
    return manual_payload(reading_minutes=reading_min, theme=selection.theme_label,
        anchor=anchor, fresh=fresh, connections_found=connections_found,
        profile=profile, wildcard=wildcard, forgotten=forgotten, date=date, issue_no=issue_no)
