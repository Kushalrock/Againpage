from __future__ import annotations
import re
from pathlib import Path
from io import StringIO
from ruamel.yaml import YAML

_yaml = YAML(typ="safe")
_FM = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)
_H1 = re.compile(r"^#\s+(.+?)\s*$", re.MULTILINE)

# Inline-markdown strippers, applied to derived titles so a note's title is
# plain text. Obsidian users routinely style an H1 (e.g. `# **Bold Title**`),
# and the stored title must match how an edition references the note (the
# writer emits the clean text), so `/notes/expand` can find it again.
_MD_WIKILINK = re.compile(r"\[\[(?:[^\]|]*\|)?([^\]]+)\]\]")   # [[t]] / [[target|t]] -> t
_MD_LINK = re.compile(r"\[([^\]]+)\]\([^)]*\)")                # [t](url) -> t
_MD_EMPH = re.compile(r"(\*\*\*|\*\*|\*|___|__|_|`)(.+?)\1")   # ***t*** **t** *t* __t__ _t_ `t` -> t

def clean_title(s: str) -> str:
    """Strip inline markdown (emphasis, inline code, links, wikilinks) from a
    title, leaving plain text. Idempotent; leaves already-plain titles unchanged."""
    s = _MD_WIKILINK.sub(r"\1", s.strip())
    s = _MD_LINK.sub(r"\1", s)
    prev = None
    while prev != s:                    # peel nested / adjacent emphasis markers
        prev, s = s, _MD_EMPH.sub(r"\2", s)
    return s.strip()

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
        ct = clean_title(t)
        if ct:
            return ct
    m = _H1.search(body)
    if m:
        ct = clean_title(m.group(1))
        if ct:
            return ct
    return Path(path).stem
