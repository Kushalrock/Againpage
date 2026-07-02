from __future__ import annotations
import re
from pathlib import PurePosixPath

_WIKI = re.compile(r"\[\[([^\]]+?)\]\]")
_MD = re.compile(r"(?<!\!)\[[^\]]*\]\(([^)]+)\)")  # (?<!!) skips images

def parse_links(body: str) -> list[str]:
    out: list[str] = []
    for raw in _WIKI.findall(body):
        target = raw.split("|", 1)[0].split("#", 1)[0].strip()
        if target:
            out.append(target)
    for raw in _MD.findall(body):
        t = raw.strip()
        if t.startswith(("http://", "https://", "mailto:", "#")):
            continue
        if t.endswith(".md"):
            out.append(t)
    return out

def resolve_link(target: str, from_path: str, known: dict[str, str]) -> str | None:
    if target in known:
        return known[target]
    stem = PurePosixPath(target).name
    if stem.endswith(".md"):
        stem = stem[:-3]
    if target[:-3] in known:  # "notes/b.md" -> "notes/b"
        return known[target[:-3]]
    if stem in known:
        return known[stem]
    return None
