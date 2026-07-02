from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, datetime, time
from typing import Literal
from uuid import UUID
from pydantic import BaseModel

ConnectionFlavor = Literal["discovery", "reminder"]

class Connection(BaseModel):
    flavor: ConnectionFlavor
    a: str
    b: str
    overlap: str
    text: str

class StandaloneSummary(BaseModel):
    note: str
    source: str
    text: str

class Question(BaseModel):
    text: str

class Wildcard(BaseModel):
    bridge: str
    trivia: str

class Forgotten(BaseModel):
    note: str
    nudge: str

class IssueContent(BaseModel):
    title: str
    dek: str
    standfirst: str
    sources: list[str]
    lead: str
    connections: list[Connection] = []
    standalone_summaries: list[StandaloneSummary] = []
    questions: list[Question] = []
    apply: list[str] = []
    wildcard: Wildcard | None = None
    forgotten: Forgotten | None = None

@dataclass
class SettingsRow:
    user_id: UUID
    vault_path: str | None
    excluded_paths: list[str]
    profile_text: str | None
    cadence: str
    delivery_time: time
    reading_min: int
    notes_per_issue: int
    provider: str
    ollama_endpoint: str
    embed_model: str | None
    summary_model: str | None
    writer_model: str | None

@dataclass
class IssueRow:
    id: UUID
    user_id: UUID
    issue_no: int | None
    issue_date: date
    theme_id: UUID | None
    theme_label: str | None
    reading_min: int
    word_target: int
    content: dict
    payload: dict | None
    model: str | None
    status: str
    synced_at: datetime | None
    created_at: datetime

@dataclass
class NewIssue:
    user_id: UUID
    issue_no: int
    issue_date: date
    theme_id: UUID | None
    theme_label: str | None
    reading_min: int
    word_target: int
    content: dict
    payload: dict | None = None
    model: str | None = None
    status: str = "generated"

class NoteDigest(BaseModel):
    substantive: bool
    summary: str
    tags: list[str]

class ProviderHealth(BaseModel):
    ok: bool
    reachable: bool
    models: dict[str, bool]
    detail: str = ""

class Payload(BaseModel):
    date: str | None = None
    issue_no: int | None = None
    reading_minutes: int
    target_word_count: int
    include: list[str]
    theme: str
    anchor: dict
    fresh: list[dict] = []
    connections_found: list[dict] = []
    wildcard: dict | None = None
    forgotten: dict | None = None
    profile: str | None = None
