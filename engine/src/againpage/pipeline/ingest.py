from __future__ import annotations
import hashlib
from pathlib import Path, PurePosixPath
from uuid import UUID
from againpage.core.models import NewNote, LinkEdge, SettingsRow
from againpage.storage.repository import Repository
from againpage.providers.base import Provider
from againpage.vault import scan, frontmatter, links

def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def _known_map(paths: list[str]) -> dict[str, str]:
    known: dict[str, str] = {}
    for p in paths:
        stem = Path(p).stem
        known[stem] = p
        known[p] = p
    return known

async def ingest_file(path: str, *, repo: Repository, provider: Provider,
                      settings: SettingsRow, user_id: UUID, known: dict[str, str] | None = None) -> str:
    text = Path(path).read_text(encoding="utf-8", errors="replace")
    h = content_hash(text)
    existing = await repo.note_by_path(user_id, path)
    if existing and existing.content_hash == h and existing.active:
        return "skipped"
    fm, body = frontmatter.parse(text)
    title = frontmatter.title_for(path, fm, body)
    digest = await provider.summarize(title, body, model=settings.summary_model or "")
    if not digest.substantive:
        await repo.upsert_note(NewNote(user_id=user_id, vault_path=path, title=title,
            content_hash=h, substantive=False, summary=None, tags=[], embedding=None))
        return "pruned"
    embedding = await provider.embed(digest.summary, model=settings.embed_model or "", task="clustering")
    note = await repo.upsert_note(NewNote(user_id=user_id, vault_path=path, title=title,
        content_hash=h, substantive=True, summary=digest.summary, tags=digest.tags, embedding=embedding))
    targets = links.parse_links(body)
    kmap = known or {}
    edges = [LinkEdge(dst_vault_path=r) for t in targets
             if (r := links.resolve_link(t, path, kmap)) is not None]
    await repo.replace_links(note.id, edges)
    return "ingested"

async def ingest_vault(vault_path: str, *, repo: Repository, provider: Provider,
                       settings: SettingsRow, user_id: UUID) -> dict:
    paths = scan.scan_vault(vault_path, excluded=settings.excluded_paths)
    known = _known_map(paths)
    counts = {"ingested": 0, "skipped": 0, "pruned": 0}
    for p in paths:
        counts[await ingest_file(p, repo=repo, provider=provider, settings=settings,
                                 user_id=user_id, known=known)] += 1
    counts["deactivated"] = await repo.deactivate_missing(user_id, set(paths))
    return counts
