from __future__ import annotations
from againpage.providers.base import Provider
from againpage.core.models import IssueContent
from againpage.generation.schema import validate_issue, repair_instruction, IssueValidationError

async def compose_issue(payload: dict, provider: Provider, *, writer_model: str) -> IssueContent:
    raw = await provider.generate(payload, model=writer_model)
    try:
        return validate_issue(raw)
    except IssueValidationError as err:
        repair_payload = {**payload, "_repair": repair_instruction(err)}
        raw2 = await provider.generate(repair_payload, model=writer_model)
        return validate_issue(raw2)  # raises on second failure
