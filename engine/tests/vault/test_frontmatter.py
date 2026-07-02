from againpage.vault.frontmatter import parse, title_for

def test_parse_splits_frontmatter():
    fm, body = parse("---\ntitle: My Note\ntags: [a, b]\n---\n# Heading\ntext")
    assert fm["title"] == "My Note" and body.startswith("# Heading")

def test_title_precedence():
    assert title_for("/x/a.md", {"title": "FM"}, "# H1\nx") == "FM"
    assert title_for("/x/a.md", {}, "# H1 Title\nx") == "H1 Title"
    assert title_for("/x/my-note.md", {}, "no heading") == "my-note"
