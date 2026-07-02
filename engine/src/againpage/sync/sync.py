from typing import Protocol
from againpage.core.models import IssueRow

class Sync(Protocol):
    async def push_issue(self, issue: IssueRow) -> None: ...

class NoopSync:
    async def push_issue(self, issue: IssueRow) -> None:
        return None
