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
