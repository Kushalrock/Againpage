from __future__ import annotations
from pathlib import Path
from againpage.core.models import NewNote, SettingsRow
from againpage.storage.repository import Repository
from againpage.providers.base import Provider
from againpage.queue.queue import Queue
from againpage.pipeline.ingest import content_hash
from againpage.pipeline.cluster import reduce_and_cluster
from againpage.pipeline.label import label_cluster
from againpage.vault import scan, frontmatter


async def run_reindex(*, repo: Repository, provider: Provider, queue: Queue,
                      settings: SettingsRow, job_id) -> str:
    """Atomic, cancellable full re-index (used after an embedding/summarisation
    model change).

    Everything — new summaries, embeddings, clusters, and labels — is computed
    in memory first, writing NOTHING to the notes/themes tables. Only once it's
    all ready is it applied in a single transaction (``repo.swap_reindex``). A
    cancel signal (checked between notes) or a crash before the swap therefore
    leaves the old data completely intact — the old edition/themes keep serving.

    Returns "done" or "cancelled".
    """
    uid = settings.user_id

    async def cancelled() -> bool:
        return await queue.is_cancelled(job_id)

    # Probe the embedding model to learn its dimension (schema adapts to it).
    probe = await provider.embed("dimension probe", model=settings.embed_model or "", task="clustering")
    dim = len(probe)

    paths = scan.scan_vault(settings.vault_path, excluded=settings.excluded_paths)
    staged: list[NewNote] = []
    for p in paths:
        if await cancelled():
            return "cancelled"
        text = Path(p).read_text(encoding="utf-8", errors="replace")
        h = content_hash(text)
        fm, body = frontmatter.parse(text)
        title = frontmatter.title_for(p, fm, body)
        digest = await provider.summarize(title, body, model=settings.summary_model or "")
        if not digest.substantive:
            staged.append(NewNote(user_id=uid, vault_path=p, title=title, content_hash=h,
                substantive=False, summary=None, tags=[], embedding=None))
            continue
        emb = await provider.embed(digest.summary, model=settings.embed_model or "", task="clustering")
        staged.append(NewNote(user_id=uid, vault_path=p, title=title, content_hash=h,
            substantive=True, summary=digest.summary, tags=digest.tags, embedding=emb))

    # Cluster the substantive notes by vault_path (ids are assigned at swap time).
    sub = [n for n in staged if n.substantive and n.embedding is not None]
    clusters = reduce_and_cluster([n.embedding for n in sub], [n.vault_path for n in sub],
        min_cluster_size=max(2, settings.notes_per_issue), random_state=42)

    by_path = {n.vault_path: n for n in sub}
    labeled: list[tuple[str, list[float], list[str]]] = []
    for c in clusters:
        if await cancelled():
            return "cancelled"
        members = [by_path[p] for p in c.member_ids if p in by_path]
        label = await label_cluster(members, provider, model=settings.summary_model or "")
        labeled.append((label, c.centroid, list(c.member_ids)))

    if await cancelled():
        return "cancelled"
    # Atomic swap — nothing above touched the live data.
    await repo.swap_reindex(uid, dim=dim, staged=staged, labeled=labeled, seen_paths=set(paths))
    return "done"
