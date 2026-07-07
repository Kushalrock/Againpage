from datetime import date, datetime, timezone
from pathlib import Path
from uuid import UUID
from fastapi import APIRouter, HTTPException
from againpage.storage.repository import Repository
from againpage.core.models import IssueContent, IssueRow, SettingsRow
from againpage.api.schemas import (IssueResponse, ArchiveItem, ArchiveGroup, ArchiveResponse,
    SettingsResponse, ProviderTestRequest, ProviderTestResult, VaultStatus, NoteExpansion)
from againpage.queue.queue import Queue
from againpage.providers.factory import make_provider
from againpage.vault.scan import scan_vaults

def make_provider_for_test(req: ProviderTestRequest, *, openrouter_key=None, ollama_key=None):
    # Use the saved keys (entered via the UI); a SettingsRow-lite carries the rest.
    return make_provider(SettingsRow(user_id=None, vault_paths=[], excluded_paths=[],
        profile_text=None, cadence_days=1, delivery_time=None, reading_min=5, notes_per_issue=3,
        provider=req.provider, ollama_endpoint=req.ollama_endpoint,
        embed_model=req.embed_model, summary_model=req.summary_model, writer_model=req.writer_model,
        openrouter_key=openrouter_key, ollama_key=ollama_key))

def _settings_response(s, count: int) -> SettingsResponse:
    return SettingsResponse(vault_paths=s.vault_paths, excluded_paths=s.excluded_paths,
        profile_text=s.profile_text or "", cadence_days=s.cadence_days,
        delivery_time=s.delivery_time.strftime("%H:%M") if s.delivery_time else "07:00",
        reading_min=s.reading_min, notes_per_issue=s.notes_per_issue, provider=s.provider,
        ollama_endpoint=s.ollama_endpoint, embed_model=s.embed_model or "",
        summary_model=s.summary_model or "", writer_model=s.writer_model or "",
        vault_note_count=count,
        has_openrouter_key=bool(s.openrouter_key), has_ollama_key=bool(s.ollama_key))

def _count(s) -> int:
    if not s.vault_paths:
        return 0
    try:
        return len(scan_vaults(s.vault_paths, excluded=s.excluded_paths))
    except OSError:
        return 0

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

    @r.get("/settings")
    async def get_settings():
        uid = await repo.ensure_local_user()
        s = await repo.get_settings(uid)
        return _settings_response(s, _count(s))

    @r.put("/settings")
    async def put_settings(patch: dict):
        uid = await repo.ensure_local_user()
        s = await repo.upsert_settings(uid, patch)
        return _settings_response(s, _count(s))

    @r.post("/provider/test")
    async def provider_test(req: ProviderTestRequest):
        s = await repo.get_settings(await repo.ensure_local_user())
        provider = make_provider_for_test(req, openrouter_key=(s.openrouter_key if s else None),
                                          ollama_key=(s.ollama_key if s else None))
        models = sorted({m for m in [req.embed_model, req.summary_model, req.writer_model] if m})
        h = await provider.health(models=models)
        return ProviderTestResult(ok=h.ok, reachable=h.reachable, models=h.models, detail=h.detail)

    @r.get("/vault/status")
    async def vault_status():
        uid = await repo.ensure_local_user()
        s = await repo.get_settings(uid)
        return VaultStatus(vault_paths=s.vault_paths, note_count=_count(s),
            scanned_at=datetime.now(timezone.utc).isoformat())

    @r.get("/notes/expand")
    async def expand_note(title: str):
        """A rich ~500-word standalone summary of one note (by title), generated
        on demand from its full text — for reading a single note in depth."""
        uid = await repo.ensure_local_user()
        note = await repo.note_by_title(uid, title)
        if not note:
            raise HTTPException(404, "note not found")
        s = await repo.get_settings(uid)
        provider = make_provider(s)
        try:
            body = Path(note.vault_path).read_text(encoding="utf-8", errors="replace")
        except OSError:
            body = note.summary or ""     # file moved/unavailable → expand from the stored summary
        text = await provider.expand_note(note.title, body, model=(s.summary_model or ""))
        return NoteExpansion(title=note.title, text=text)

    from againpage.api.schemas import AppStatus
    from againpage.scheduler.scheduler import Scheduler

    @r.post("/reindex")
    async def reindex(force: bool = False):
        if queue is None:
            raise HTTPException(503, "queue unavailable")
        uid = await repo.ensure_local_user()
        s = await repo.get_settings(uid)
        if not s or not s.vault_paths:
            raise HTTPException(409, "no notes folder set")
        # force=true re-processes every note even if unchanged (used after a
        # summary/embedding model change).
        job_id = await queue.enqueue("ingest", {"force": True} if force else {})
        return {"job_id": str(job_id)}

    @r.post("/jobs/cancel")
    async def cancel_jobs(type: str):
        if queue is None:
            raise HTTPException(503, "queue unavailable")
        return {"cancelled": await queue.cancel(type)}

    @r.get("/status")
    async def status():
        uid = await repo.ensure_local_user()
        s = await repo.get_settings(uid)
        themes = await repo.themes(uid)
        notes = await repo.active_notes(uid)
        issues = await repo.list_issues(uid)
        indexed = len(themes) > 0
        latest = issues[0] if issues else None
        next_edition_at = None
        if indexed and s and s.delivery_time:
            nd = Scheduler(repo, queue).next_due(
                s, now=datetime.now(), last_issue_date=(latest.issue_date if latest else None))
            next_edition_at = nd.isoformat()
        return AppStatus(
            indexed=indexed, theme_count=len(themes), note_count=len(notes), issue_count=len(issues),
            latest_issue_date=(latest.issue_date.isoformat() if latest else None),
            next_edition_at=next_edition_at,
            delivery_time=(s.delivery_time.strftime("%H:%M") if s and s.delivery_time else "07:00"),
            cadence_days=(s.cadence_days if s else 1),
            active_jobs=(await queue.active_types() if queue else []))

    return r
