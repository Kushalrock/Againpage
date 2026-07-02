from againpage.core.models import IssueContent, Connection

def test_issuecontent_roundtrips_minimal():
    c = IssueContent(
        title="Amor Fati", dek="Today's edition", standfirst="Three thinkers…",
        sources=["Amor Fati"], lead="# body", connections=[
            Connection(flavor="discovery", a="A", b="B", overlap="x", text="y")],
        standalone_summaries=[], questions=[], apply=[], wildcard=None, forgotten=None)
    assert c.model_dump()["connections"][0]["flavor"] == "discovery"

def test_connection_flavor_is_validated():
    import pytest
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        Connection(flavor="nope", a="A", b="B", overlap="x", text="y")
