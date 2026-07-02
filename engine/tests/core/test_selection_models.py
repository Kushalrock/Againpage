from uuid import uuid4
from againpage.core.models import IssueNote, Selection, SelectedNote

def test_issue_note_and_selection():
    nid = uuid4()
    sn = SelectedNote(note_id=nid, vault_path="a.md", title="A", summary="s")
    sel = Selection(theme_id=uuid4(), theme_label="Stoicism", anchor=sn, fresh=[sn],
        connections=[], wildcard=None, forgotten=None,
        records=[IssueNote(note_id=nid, role="anchor", theme_angle="Stoicism")])
    assert sel.records[0].role == "anchor" and sel.anchor.title == "A"
