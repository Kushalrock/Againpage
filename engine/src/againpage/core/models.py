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
    vault_paths: list[str]
    excluded_paths: list[str]
    profile_text: str | None
    cadence_days: int
    delivery_time: time
    reading_min: int
    notes_per_issue: int
    provider: str
    ollama_endpoint: str
    embed_model: str | None
    summary_model: str | None
    writer_model: str | None
    openrouter_key: str | None = None
    ollama_key: str | None = None

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

@dataclass
class NewNote:
    user_id: UUID
    vault_path: str
    title: str
    content_hash: str
    substantive: bool
    summary: str | None
    tags: list[str]
    embedding: list[float] | None

@dataclass
class NoteRow:
    id: UUID
    user_id: UUID
    vault_path: str
    title: str
    content_hash: str
    substantive: bool
    summary: str | None
    tags: list[str]
    embedding: list[float] | None
    active: bool
    updated_at: datetime | None

@dataclass
class LinkEdge:
    dst_vault_path: str          # resolved target path; None targets are dropped before this

@dataclass
class NoteNeighbor:
    note_id: UUID
    vault_path: str
    title: str
    summary: str | None
    similarity: float            # 1 - cosine_distance

@dataclass
class ThemeRow:
    id: UUID
    user_id: UUID
    label: str
    centroid: list[float] | None
    membership_hash: str | None
    last_visited_at: datetime | None
    created_at: datetime

@dataclass
class Cluster:
    member_ids: list[UUID]
    centroid: list[float]
    membership_hash: str

@dataclass
class ClusterInput:
    label: str
    centroid: list[float]
    membership_hash: str
    member_ids: list[UUID]
    weights: dict[UUID, float] = field(default_factory=dict)
    last_visited_at: datetime | None = None

@dataclass
class IssueNote:
    note_id: UUID
    role: str                    # anchor|fresh|connection|wildcard|forgotten
    theme_angle: str | None

@dataclass
class SelectedNote:
    note_id: UUID
    vault_path: str
    title: str
    summary: str | None

@dataclass
class SelectedConnection:
    note: SelectedNote
    flavor: str                  # discovery|reminder
    why: str

@dataclass
class Selection:
    theme_id: UUID | None
    theme_label: str
    anchor: SelectedNote
    fresh: list[SelectedNote]
    connections: list[SelectedConnection]
    wildcard: SelectedNote | None
    forgotten: SelectedNote | None
    records: list[IssueNote] = field(default_factory=list)
    wildcard_from_theme: str | None = None

@dataclass
class ThemeCtx:
    theme_id: UUID
    label: str
    centroid: list[float]
    last_visited_at: object | None      # datetime | None
    member_ids: list[UUID]

@dataclass
class LinkCtx:
    src: UUID
    dst: UUID
    created_at: object | None
    last_seen_at: object | None

@dataclass
class SelectionContext:
    themes: list[ThemeCtx]
    notes_by_id: dict[UUID, NoteRow]
    surfaced: dict[UUID, object]         # note_id -> last surfaced date (or None)
    links: list[LinkCtx]
    notes_per_issue: int
