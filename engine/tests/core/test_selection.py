import random
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4
from againpage.core.models import NoteRow, SelectionContext, ThemeCtx, LinkCtx
from againpage.core.selection import select

NOW = datetime(2026, 6, 30, tzinfo=timezone.utc)

def _note(nid, vec, title="N"):
    return NoteRow(id=nid, user_id=uuid4(), vault_path=f"{title}.md", title=title,
        content_hash="h", substantive=True, summary=f"sum-{title}", tags=["t"],
        embedding=vec, active=True, updated_at=NOW - timedelta(days=90))

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
