from uuid import uuid4
from againpage.core.models import NewNote, LinkEdge

def test_new_note_and_edge():
    n = NewNote(user_id=uuid4(), vault_path="a.md", title="A", content_hash="h",
                substantive=True, summary="s", tags=["x"], embedding=[0.1]*768)
    assert n.substantive and len(n.embedding) == 768
    e = LinkEdge(dst_vault_path="b.md")
    assert e.dst_vault_path == "b.md"
