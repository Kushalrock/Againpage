from uuid import uuid4
from againpage.core.models import Selection, SelectedNote, SelectedConnection
from againpage.generation.payload import build_payload

def _sn(title): return SelectedNote(note_id=uuid4(), vault_path=f"{title}.md", title=title, summary=f"sum-{title}")

def test_payload_has_full_text_for_anchor_and_summaries_for_refs():
    sel = Selection(theme_id=uuid4(), theme_label="Stoicism", anchor=_sn("Amor Fati"),
        fresh=[_sn("Control")], connections=[SelectedConnection(note=_sn("Serenity"),
        flavor="reminder", why="lineage")], wildcard=_sn("Apollo"), forgotten=_sn("Ataraxia"),
        records=[], wildcard_from_theme="Space")
    texts = {"Amor Fati.md": "FULL AMOR", "Control.md": "FULL CONTROL"}
    p = build_payload(sel, reading_min=7, profile="I design software",
                      read_note_text=lambda path: texts.get(path, ""))
    assert p["anchor"]["text"] == "FULL AMOR" and p["anchor"]["title"] == "Amor Fati"
    assert p["fresh"][0]["text"] == "FULL CONTROL"
    assert p["connections_found"][0]["flavor"] == "reminder"
    assert p["wildcard"]["from_theme"] == "Space"
    assert p["forgotten"]["note"] == "Ataraxia"
    assert p["profile"] == "I design software" and p["target_word_count"] == 1540
