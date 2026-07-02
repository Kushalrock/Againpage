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
    vault_path: str
    excluded_paths: list[str]
    profile_text: str
    cadence: str
    delivery_time: str
    reading_min: int
    notes_per_issue: int
    provider: str
    ollama_endpoint: str
    embed_model: str
    summary_model: str
    writer_model: str
    vault_note_count: int

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
    vault_path: str
    note_count: int
    scanned_at: str
