from __future__ import annotations
import random
from datetime import datetime
from uuid import UUID
from againpage.core.models import (SelectionContext, Selection, SelectedNote,
    SelectedConnection, IssueNote, NoteRow, ThemeCtx)
from againpage.core.scoring import (cosine, recency_decay, staleness, link_penalty,
    unsurfaced_fraction, weighted_sample)

# --- tunable weights (Stage 1/2) ---
W_THEME_RECENCY = 1.0
W_THEME_UNSURFACED = 1.2
W_FRESH_NEW = 1.5
W_FRESH_REL = 1.0
W_FRESH_STALE = 0.6

def _selected(n: NoteRow) -> SelectedNote:
    return SelectedNote(note_id=n.id, vault_path=n.vault_path, title=n.title, summary=n.summary)

def select(ctx: SelectionContext, *, now: datetime, rng: random.Random) -> Selection:
    # ---- Stage 1: pick theme (filter too-small; sample proportional to score) ----
    eligible = [t for t in ctx.themes if len(t.member_ids) >= ctx.notes_per_issue]
    if not eligible:
        eligible = [t for t in ctx.themes if len(t.member_ids) >= 2] or ctx.themes
    scores = [W_THEME_RECENCY * recency_decay(t.last_visited_at, now)
              + W_THEME_UNSURFACED * unsurfaced_fraction(t.member_ids, ctx.surfaced)
              for t in eligible]
    theme = weighted_sample(eligible, [s + 1e-6 for s in scores], rng)
    members = [ctx.notes_by_id[i] for i in theme.member_ids if i in ctx.notes_by_id]

    # ---- Stage 2: anchor (nearest centroid) + fresh (unsurfaced+related+stale) ----
    anchor = min(members, key=lambda n: -cosine(n.embedding, theme.centroid))
    rest = [n for n in members if n.id != anchor.id]
    fresh_scores = [W_FRESH_NEW * (1.0 if ctx.surfaced.get(n.id) is None else 0.0)
                    + W_FRESH_REL * cosine(n.embedding, anchor.embedding)
                    + W_FRESH_STALE * staleness(ctx.surfaced.get(n.id), now)
                    for n in rest]
    fresh: list[NoteRow] = []
    pool = list(zip(rest, fresh_scores))
    for _ in range(min(2, len(pool))):
        picked = weighted_sample([p[0] for p in pool], [p[1] + 1e-6 for p in pool], rng)
        fresh.append(picked)
        pool = [p for p in pool if p[0].id != picked.id]

    # ---- Stage 3: connections (nearest neighbours across vault; score = sim - penalty) ----
    chosen_ids = {anchor.id, *[f.id for f in fresh]}
    link_index = {(l.src, l.dst): l for l in ctx.links}
    link_index.update({(l.dst, l.src): l for l in ctx.links})
    connections: list[SelectedConnection] = []
    for base in [anchor, *fresh]:
        for cand in ctx.notes_by_id.values():
            if cand.id in chosen_ids or cand.id == base.id:
                continue
            sim = cosine(base.embedding, cand.embedding)
            link = link_index.get((base.id, cand.id))
            penalty, flavor = link_penalty(
                getattr(link, "created_at", None), getattr(link, "last_seen_at", None),
                cand.updated_at, now) if link else (0.0, "discovery")
            if flavor == "excluded":
                continue
            connections.append((sim - penalty, SelectedConnection(
                note=_selected(cand), flavor=flavor,
                why=f"shared idea between {base.title} and {cand.title}")))
    connections.sort(key=lambda t: -t[0])
    top_conn = [c for _, c in connections[:max(2, ctx.notes_per_issue)]]
    chosen_ids |= {c.note.note_id for c in top_conn}

    # ---- Stage 4: wildcard (theme farthest from today's; unsurfaced member) ----
    wildcard = None; wildcard_from = None
    others = [t for t in ctx.themes if t.theme_id != theme.theme_id]
    if others:
        far = max(others, key=lambda t: 1 - cosine(t.centroid, theme.centroid))
        far_members = [ctx.notes_by_id[i] for i in far.member_ids
                       if i in ctx.notes_by_id and i not in chosen_ids]
        unseen = [n for n in far_members if ctx.surfaced.get(n.id) is None] or far_members
        if unseen:
            wildcard = _selected(weighted_sample(unseen, [1.0] * len(unseen), rng))
            wildcard_from = far.label

    # ---- Stage 5: forgotten (most overdue across all notes; ignore theme) ----
    all_notes = list(ctx.notes_by_id.values())
    forgotten = None
    candidates = [n for n in all_notes if n.id not in chosen_ids]
    if candidates:
        overdue = max(candidates, key=lambda n: staleness(ctx.surfaced.get(n.id), now))
        forgotten = _selected(overdue)

    # ---- Stage 6: build the records to persist ----
    records = [IssueNote(note_id=anchor.id, role="anchor", theme_angle=theme.label)]
    records += [IssueNote(note_id=f.id, role="fresh", theme_angle=theme.label) for f in fresh]
    records += [IssueNote(note_id=c.note.note_id, role="connection", theme_angle=theme.label)
                for c in top_conn]
    if wildcard:
        records.append(IssueNote(note_id=wildcard.note_id, role="wildcard", theme_angle=wildcard_from))
    if forgotten:
        records.append(IssueNote(note_id=forgotten.note_id, role="forgotten", theme_angle=None))

    return Selection(theme_id=theme.theme_id, theme_label=theme.label, anchor=_selected(anchor),
        fresh=[_selected(f) for f in fresh], connections=top_conn, wildcard=wildcard,
        forgotten=forgotten, records=records, wildcard_from_theme=wildcard_from)
