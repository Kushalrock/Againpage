from againpage.vault.links import parse_links, resolve_link

def test_parse_both_styles():
    body = "See [[Amor Fati]] and [[Stoicism|the school]] and [[Control#part]] and [ref](notes/b.md)."
    assert parse_links(body) == ["Amor Fati", "Stoicism", "Control", "notes/b.md"]

def test_parse_ignores_external_and_images():
    body = "[site](https://x.com) and ![img](pic.png) and [ok](c.md)"
    assert parse_links(body) == ["c.md"]

def test_resolve_wikilink_by_stem_and_md_by_relpath(tmp_path=None):
    known = {"Amor Fati": "/v/Amor Fati.md", "notes/b": "/v/notes/b.md", "b": "/v/notes/b.md"}
    assert resolve_link("Amor Fati", "/v/x.md", known) == "/v/Amor Fati.md"
    assert resolve_link("notes/b.md", "/v/x.md", known) == "/v/notes/b.md"
    assert resolve_link("Missing", "/v/x.md", known) is None
