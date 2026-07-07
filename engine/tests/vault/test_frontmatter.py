from againpage.vault.frontmatter import parse, title_for, clean_title

def test_parse_splits_frontmatter():
    fm, body = parse("---\ntitle: My Note\ntags: [a, b]\n---\n# Heading\ntext")
    assert fm["title"] == "My Note" and body.startswith("# Heading")

def test_title_precedence():
    assert title_for("/x/a.md", {"title": "FM"}, "# H1\nx") == "FM"
    assert title_for("/x/a.md", {}, "# H1 Title\nx") == "H1 Title"
    assert title_for("/x/my-note.md", {}, "no heading") == "my-note"

def test_title_strips_markdown_so_it_matches_edition_references():
    # The real bug: `# **The Engineers' Republic**` was stored WITH the ** markers,
    # but editions reference it as the clean text, so /notes/expand 404'd.
    assert title_for("/x/German History.md", {}, "# **The Engineers' Republic**\nbody") \
        == "The Engineers' Republic"

def test_clean_title_handles_emphasis_code_and_links():
    assert clean_title("**Bold**") == "Bold"
    assert clean_title("*Italic* Word") == "Italic Word"
    assert clean_title("***Both***") == "Both"
    assert clean_title("`code` word") == "code word"
    assert clean_title("[Linked](http://u)") == "Linked"
    assert clean_title("[[Wiki Note]]") == "Wiki Note"
    assert clean_title("[[german-history|The Engineers' Republic]]") == "The Engineers' Republic"
    assert clean_title("Plain Title") == "Plain Title"        # untouched

def test_title_falls_back_when_cleaning_empties_the_heading():
    # A heading of only markers cleans to "" — fall through to the filename.
    assert title_for("/x/note.md", {}, "# **  **\nbody") == "note"
