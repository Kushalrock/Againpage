from __future__ import annotations
from againpage.core.models import NoteRow
from againpage.providers.base import Provider

LABEL_SYSTEM = (
    "You name a cluster of a person's notes with a short theme label (at most 4 words). "
    "Use ONLY the notes' titles, summaries, and tags provided. Name the underlying idea, "
    "not a list of nouns. Add nothing not supported by the notes. Output ONLY JSON: "
    '{"substantive": true, "summary": "<label>", "tags": []}'
)

def _members_block(members: list[NoteRow]) -> str:
    lines = []
    for n in members[:30]:
        lines.append(f"- {n.title}: {n.summary or ''} [tags: {', '.join(n.tags)}]")
    return "\n".join(lines)

async def label_cluster(members: list[NoteRow], provider: Provider, *, model: str) -> str:
    # Reuse the provider's summarize channel (JSON digest) with the labeling system prompt by
    # passing the members block as the note body and a synthetic title.
    digest = await _label_call(provider, model, _members_block(members))
    return digest.summary.strip()

async def _label_call(provider: Provider, model: str, body: str):
    # summarize(title, body) uses PER_NOTE_SYSTEM; for labeling we pass a body that instructs
    # the label task explicitly so any Provider implementation works without a new method.
    prompt_body = f"{LABEL_SYSTEM}\n\nNOTES:\n{body}"
    return await provider.summarize("Theme label", prompt_body, model=model)
