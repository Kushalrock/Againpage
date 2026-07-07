import pytest
from againpage.generation.schema import validate_issue, extract_json, IssueValidationError

VALID = {
    "title":"T","dek":"d","standfirst":"s","sources":["a"],"lead":"# x",
    "connections":[{"flavor":"discovery","a":"A","b":"B","overlap":"o","text":"t"}],
    "standalone_summaries":[],"questions":[],"apply":[],"wildcard":None,"forgotten":None,
}

def test_valid_passes():
    assert validate_issue(VALID).title == "T"

def test_bad_flavor_raises():
    bad = {**VALID, "connections":[{"flavor":"nope","a":"A","b":"B","overlap":"o","text":"t"}]}
    with pytest.raises(IssueValidationError):
        validate_issue(bad)

def test_extract_json_from_fenced_text():
    txt = "Here you go:\n```json\n{\"a\": 1}\n```\nthanks"
    assert extract_json(txt) == {"a": 1}

def test_extract_json_handles_nested_objects():
    txt = '```json\n{"a": {"b": 1}, "c": [1,2]}\n```'
    assert extract_json(txt) == {"a": {"b": 1}, "c": [1, 2]}

def test_extract_json_raises_on_garbage():
    with pytest.raises(IssueValidationError):
        extract_json("not json at all")

def test_extract_json_allows_literal_control_chars_in_strings():
    # Writer models routinely emit a multi-line markdown body as a JSON string
    # with RAW newlines/tabs inside it. Strict json.loads rejects those
    # ("Invalid control character"); we accept them and keep them verbatim.
    txt = '{"lead": "# Heading\n\nA paragraph\twith a tab.", "title": "T"}'
    assert extract_json(txt) == {"lead": "# Heading\n\nA paragraph\twith a tab.", "title": "T"}
