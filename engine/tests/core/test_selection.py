import random
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from againpage.core.models import NoteRow, SelectionContext, ThemeCtx, LinkCtx
from againpage.core.selection import select

NOW = datetime(2026, 6, 30, tzinfo=timezone.utc)

def _note(nid, vec, title="N", updated_at=None):
    return NoteRow(id=nid, user_id=uuid4(), vault_path=f"{title}.md", title=title,
        content_hash="h", substantive=True, summary=f"sum-{title}", tags=["t"],
        embedding=vec, active=True, updated_at=updated_at or NOW - timedelta(days=90))

def _ctx(themes, notes, surfaced, links, npi=3):
    return SelectionContext(themes=themes, notes_by_id={n.id: n for n in notes},
        surfaced=surfaced, links=links, notes_per_issue=npi)

def test_picks_theme_and_anchor_and_fresh():
    a, b, c = uuid4(), uuid4(), uuid4()
    notes = [_note(a, [1.0, 0, 0], "A"), _note(b, [0.9, 0.1, 0], "B"), _note(c, [0.8, 0, 0.2], "C")]
    theme = ThemeCtx(theme_id=uuid4(), label="Stoicism", centroid=[0.9, 0, 0],
        last_visited_at=None, member_ids=[a, b, c])
    sel = select(_ctx([theme], notes, {}, []), now=NOW, rng=random.Random(1))
    assert sel.theme_label == "Stoicism"
    assert sel.anchor.note_id in {a, b, c}
    assert 1 <= len(sel.fresh) <= 2
    roles = {r.role for r in sel.records}
    assert "anchor" in roles and "fresh" in roles

def test_no_link_vault_yields_all_discovery():
    a, b = uuid4(), uuid4()
    notes = [_note(a, [1.0, 0], "A"), _note(b, [0.95, 0.05], "B")]
    theme = ThemeCtx(theme_id=uuid4(), label="T", centroid=[0.97, 0],
        last_visited_at=None, member_ids=[a, b])
    sel = select(_ctx([theme], notes, {}, [], npi=2), now=NOW, rng=random.Random(2))
    assert all(c.flavor == "discovery" for c in sel.connections)

def test_theme_too_small_is_filtered():
    a = uuid4()
    small = ThemeCtx(theme_id=uuid4(), label="Small", centroid=[1.0, 0],
        last_visited_at=None, member_ids=[a])                       # 1 < notes_per_issue
    big_ids = [uuid4() for _ in range(3)]
    big = ThemeCtx(theme_id=uuid4(), label="Big", centroid=[0.0, 1.0],
        last_visited_at=None, member_ids=big_ids)
    notes = [_note(a, [1.0, 0], "A")] + [_note(i, [0.0, 1.0], f"B{k}") for k, i in enumerate(big_ids)]
    sel = select(_ctx([small, big], notes, {}, [], npi=3), now=NOW, rng=random.Random(3))
    assert sel.theme_label == "Big"   # small theme filtered by granularity guard

def test_wildcard_from_farthest_theme_and_forgotten_excludes_chosen():
    # Two well-separated (orthogonal) themes, each with >= notes_per_issue members,
    # so Stage 1 keeps both eligible and Stage 4 (wildcard) has a real "other" theme
    # to pull from, while Stage 5 (forgotten) has to dodge everything already chosen.
    a_ids = [uuid4() for _ in range(5)]
    a_notes = [_note(i, [1.0, 0.02 * k], f"A{k}") for k, i in enumerate(a_ids)]

    b_ids = [uuid4() for _ in range(5)]
    b_notes = [_note(i, [0.02 * k, 1.0], f"B{k}") for k, i in enumerate(b_ids)]

    # A note that is a member of theme B but never surfaced and drastically stale,
    # so it's the clear "most overdue" candidate for Stage 5 if it survives exclusion.
    forgotten_id = uuid4()
    forgotten_note = _note(forgotten_id, [0.0, 0.9], "Forgotten", updated_at=NOW - timedelta(days=1000))

    notes = a_notes + b_notes + [forgotten_note]

    theme_a = ThemeCtx(theme_id=uuid4(), label="ThemeA", centroid=[1.0, 0.0],
        last_visited_at=None, member_ids=a_ids)
    theme_b = ThemeCtx(theme_id=uuid4(), label="ThemeB", centroid=[0.0, 1.0],
        last_visited_at=None, member_ids=b_ids + [forgotten_id])

    # Surface some notes in both themes so Stage 2/4 have both seen and unseen members;
    # forgotten_id and a couple of others are deliberately left unsurfaced.
    surfaced = {}
    for i in a_ids[:3]:
        surfaced[i] = NOW - timedelta(days=5)
    for i in b_ids[:3]:
        surfaced[i] = NOW - timedelta(days=5)

    ctx = _ctx([theme_a, theme_b], notes, surfaced, [], npi=3)

    # Seed chosen so today's theme is ThemeA and the pre-fix bug (forgotten colliding
    # with a Stage-3 connection) reproduces deterministically -- this is the regression case.
    sel = select(ctx, now=NOW, rng=random.Random(3))

    other_label = "ThemeB" if sel.theme_label == "ThemeA" else "ThemeA"

    assert sel.wildcard is not None
    assert sel.wildcard_from_theme == other_label   # farthest theme, not today's

    assert sel.forgotten is not None
    chosen_ids = {sel.anchor.note_id} | {f.note_id for f in sel.fresh} \
        | {c.note.note_id for c in sel.connections}
    assert sel.forgotten.note_id not in chosen_ids  # regression: no double role for one note
