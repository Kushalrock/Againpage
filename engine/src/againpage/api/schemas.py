from pydantic import BaseModel
from againpage.core.models import IssueContent

class IssueResponse(BaseModel):
    id: str
    issue_no: int
    issue_date: str
    reading_min: int
    theme_label: str
    content: IssueContent

class ArchiveItem(BaseModel):
    id: str
    issue_no: int
    date: str
    title: str
    dek: str
    tags: list[str]
    reading_min: int

class ArchiveGroup(BaseModel):
    label: str
    items: list[ArchiveItem]

class ArchiveResponse(BaseModel):
    groups: list[ArchiveGroup]
    total: int

class SettingsResponse(BaseModel):
    vault_paths: list[str]
    excluded_paths: list[str]
    profile_text: str
    cadence_days: int
    delivery_time: str
    reading_min: int
    notes_per_issue: int
    provider: str
    ollama_endpoint: str
    embed_model: str
    summary_model: str
    writer_model: str
    vault_note_count: int
    has_openrouter_key: bool = False   # keys are write-only; expose only whether one is saved
    has_ollama_key: bool = False

class ProviderTestRequest(BaseModel):
    provider: str
    ollama_endpoint: str
    embed_model: str
    summary_model: str
    writer_model: str

class ProviderTestResult(BaseModel):
    ok: bool
    reachable: bool
    models: dict[str, bool]
    detail: str = ""

class VaultStatus(BaseModel):
    vault_paths: list[str]
    note_count: int
    scanned_at: str

class NoteExpansion(BaseModel):
    title: str
    text: str

class AppStatus(BaseModel):
    indexed: bool
    theme_count: int
    note_count: int
    issue_count: int
    latest_issue_date: str | None
    next_edition_at: str | None
    delivery_time: str
    cadence_days: int
    active_jobs: list[str] = []   # job types currently queued/running (ingest|cluster|generate)
