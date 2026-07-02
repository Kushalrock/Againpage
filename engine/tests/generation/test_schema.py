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
