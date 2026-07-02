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
