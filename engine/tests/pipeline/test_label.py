from datetime import datetime, timezone
from uuid import uuid4
from againpage.core.models import NoteRow
from againpage.pipeline.label import label_cluster

def _note(title, summary, tags):
    return NoteRow(id=uuid4(), user_id=uuid4(), vault_path=f"{title}.md", title=title,
        content_hash="h", substantive=True, summary=summary, tags=tags, embedding=[0.0]*768,
        active=True, updated_at=datetime.now(timezone.utc))

class FakeProvider:
    def __init__(self): self.seen_prompt = ""
    async def generate(self, payload, *, model): ...
    async def summarize(self, title, body, *, model):
        from againpage.core.models import NoteDigest
        self.seen_prompt = body
        return NoteDigest(substantive=True, summary="Stoicism", tags=[])
    async def embed(self, *a, **k): ...
    async def health(self, *, models): ...

async def test_label_uses_member_context_and_returns_short_label():
    members = [_note("Amor Fati", "loving fate", ["stoicism"]),
               _note("Dichotomy of Control", "up to us or not", ["stoicism"])]
    p = FakeProvider()
    label = await label_cluster(members, p, model="m")
    assert label == "Stoicism"
    assert "Amor Fati" in p.seen_prompt and "loving fate" in p.seen_prompt
