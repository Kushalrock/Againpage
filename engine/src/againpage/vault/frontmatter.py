from __future__ import annotations
import re
from pathlib import Path
from io import StringIO
from ruamel.yaml import YAML

_yaml = YAML(typ="safe")
_FM = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)
_H1 = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)

def parse(text: str) -> tuple[dict, str]:
    m = _FM.match(text)
    if not m:
        return {}, text
    try:
        fm = _yaml.load(StringIO(m.group(1))) or {}
    except Exception:  # noqa: BLE001
        fm = {}
    return (fm if isinstance(fm, dict) else {}), m.group(2)

def title_for(path: str, frontmatter: dict, body: str) -> str:
    t = frontmatter.get("title")
    if isinstance(t, str) and t.strip():
        return t.strip()
    m = _H1.search(body)
    if m:
        return m.group(1).strip()
    return Path(path).stem
