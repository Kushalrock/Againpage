import pytest
from againpage.generation.writer import compose_issue
from againpage.generation.schema import IssueValidationError

VALID = {"title":"T","dek":"d","standfirst":"s","sources":["a"],"lead":"x",
    "connections":[],"standalone_summaries":[],"questions":[],"apply":[],"wildcard":None,"forgotten":None}
BAD = {**VALID, "connections":[{"flavor":"nope","a":"A","b":"B","overlap":"o","text":"t"}]}

class FakeProvider:
    def __init__(self, outputs): self.outputs = list(outputs); self.calls = 0
    async def generate(self, payload, *, model): self.calls += 1; return self.outputs.pop(0)
    async def summarize(self, *a, **k): ...
    async def embed(self, *a, **k): ...
    async def health(self, *, models): ...

async def test_valid_first_try():
    p = FakeProvider([VALID])
    issue = await compose_issue({"target_word_count":1000}, p, writer_model="m")
    assert issue.title == "T" and p.calls == 1

async def test_repair_retry_succeeds():
    p = FakeProvider([BAD, VALID])
    issue = await compose_issue({"target_word_count":1000}, p, writer_model="m")
    assert issue.title == "T" and p.calls == 2

async def test_two_failures_raise():
    p = FakeProvider([BAD, BAD])
    with pytest.raises(IssueValidationError):
        await compose_issue({"target_word_count":1000}, p, writer_model="m")
    assert p.calls == 2
