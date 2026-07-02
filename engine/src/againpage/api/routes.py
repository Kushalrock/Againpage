from datetime import date
from uuid import UUID
from fastapi import APIRouter, HTTPException
from againpage.storage.repository import Repository
from againpage.core.models import IssueContent, IssueRow
from againpage.api.schemas import IssueResponse, ArchiveItem, ArchiveGroup, ArchiveResponse
from againpage.queue.queue import Queue

def _to_response(row: IssueRow) -> IssueResponse:
    return IssueResponse(
        id=str(row.id), issue_no=row.issue_no or 0, issue_date=row.issue_date.isoformat(),
        reading_min=row.reading_min, theme_label=row.theme_label or "",
        content=IssueContent(**row.content))

def _group_label(d: date, today: date) -> str:
    if (today - d).days < 7:
        return "This week"
    return f"Earlier in {d.strftime('%B')}"

def make_router(repo: Repository, queue: Queue | None = None) -> APIRouter:
    r = APIRouter()

    @r.get("/health")
    async def health():
        return {"status": "ok"}

    @r.post("/trigger")
    async def trigger():
        if queue is None:
            raise HTTPException(503, "queue unavailable")
        job_id = await queue.enqueue("generate", {})
        return {"job_id": str(job_id)}

    @r.get("/issues/today")
    async def today():
        uid = await repo.ensure_local_user()
        row = await repo.latest_issue(uid)
        if not row:
            raise HTTPException(404, "no issue yet")
        return _to_response(row)

    @r.get("/issues/{issue_id}")
    async def get_one(issue_id: UUID):
        row = await repo.get_issue(issue_id)
        if not row:
            raise HTTPException(404, "not found")
        return _to_response(row)

    @r.get("/issues")
    async def archive():
        uid = await repo.ensure_local_user()
        rows = await repo.list_issues(uid)
        today_d = rows[0].issue_date if rows else date.today()
        groups: dict[str, list[ArchiveItem]] = {}
        for row in rows:
            c = IssueContent(**row.content)
            item = ArchiveItem(
                id=str(row.id), issue_no=row.issue_no or 0, date=row.issue_date.isoformat(),
                title=c.title, dek=c.standfirst, tags=[], reading_min=row.reading_min)
            groups.setdefault(_group_label(row.issue_date, today_d), []).append(item)
        return ArchiveResponse(
            groups=[ArchiveGroup(label=k, items=v) for k, v in groups.items()],
            total=len(rows))

    return r
