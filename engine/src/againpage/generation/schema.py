from __future__ import annotations
import json, re
from pydantic import ValidationError
from againpage.core.models import IssueContent

class IssueValidationError(Exception):
    def __init__(self, errors): super().__init__(str(errors)); self.errors = errors

_FENCE = re.compile(r"```(?:json)?\s*(\{.*\})\s*```", re.DOTALL)

def extract_json(text: str) -> dict:
    text = text.strip()
    m = _FENCE.search(text)
    candidate = m.group(1) if m else text
    if not candidate.lstrip().startswith("{"):
        start = candidate.find("{"); end = candidate.rfind("}")
        if start >= 0 and end > start:
            candidate = candidate[start:end + 1]
    try:
        return json.loads(candidate)
    except json.JSONDecodeError as e:
        raise IssueValidationError([{"type": "json_decode", "msg": str(e)}]) from e

def validate_issue(raw: dict) -> IssueContent:
    try:
        return IssueContent(**raw)
    except ValidationError as e:
        raise IssueValidationError(e.errors()) from e

def repair_instruction(err: IssueValidationError) -> str:
    return ("Your previous output failed schema validation with these errors: "
            f"{json.dumps(err.errors)[:800]}. Return corrected STRICT JSON only, "
            "matching the schema exactly, no prose, no code fences.")
