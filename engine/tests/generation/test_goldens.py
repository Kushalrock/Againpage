import json
import glob
import os
import pytest
from againpage.generation.writer import compose_issue

VALID = {
    "title": "Test Golden Issue",
    "dek": "A test dek for golden validation",
    "standfirst": "s",
    "sources": ["a"],
    "lead": "Test lead content",
    "connections": [
        {
            "flavor": "discovery",
            "a": "topicA",
            "b": "topicB",
            "overlap": "shared context",
            "text": "How topic A relates to topic B"
        }
    ],
    "standalone_summaries": [],
    "questions": [],
    "apply": [],
    "wildcard": None,
    "forgotten": None,
}


class FakeProvider:
    async def generate(self, payload, *, model):
        return VALID

    async def summarize(self, *a, **k):
        pass

    async def embed(self, *a, **k):
        pass

    async def health(self, *, models):
        pass


@pytest.mark.asyncio
async def test_all_goldens_compose_and_validate():
    files = glob.glob(
        os.path.join(os.path.dirname(__file__), "..", "..", "goldens", "*.json")
    )
    assert files, "no golden payloads found"
    for f in files:
        with open(f) as fh:
            payload = json.load(fh)
        issue = await compose_issue(payload, FakeProvider(), writer_model="m")
        assert issue.title
        assert issue.dek
        assert issue.lead
        assert isinstance(issue.connections, list)
