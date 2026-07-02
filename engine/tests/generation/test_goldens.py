import json
import glob
import os
import pytest
from againpage.generation.writer import compose_issue

VALID = {
    "title": "T",
    "dek": "d",
    "standfirst": "s",
    "sources": ["a"],
    "lead": "x",
    "connections": [],
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
        payload = json.load(open(f))
        issue = await compose_issue(payload, FakeProvider(), writer_model="m")
        assert issue.title  # validated IssueContent
