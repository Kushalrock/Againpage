from __future__ import annotations
import os
from pathlib import Path

def _norm_excludes(root: str, excluded: list[str]) -> list[Path]:
    out: list[Path] = []
    rootp = Path(root)
    for e in excluded:
        e = e.strip()
        if not e:
            continue
        p = Path(e).expanduser()
        out.append(p if p.is_absolute() else (rootp / e.lstrip("./")).resolve())
    return out

def is_excluded(path: str, root: str, excluded: list[str]) -> bool:
    rp = Path(path).resolve()
    for ex in _norm_excludes(root, excluded):
        if rp == ex or ex in rp.parents:
            return True
    return False

def scan_vault(root: str, *, excluded: list[str]) -> list[str]:
    exset = _norm_excludes(root, excluded)
    found: list[str] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dp = Path(dirpath).resolve()
        dirnames[:] = [d for d in dirnames
                       if not any((dp / d).resolve() == ex or ex in (dp / d).resolve().parents for ex in exset)]
        for fn in filenames:
            if fn.endswith(".md"):
                found.append(str((dp / fn).resolve()))
    return sorted(found)

def scan_vaults(roots: list[str], *, excluded: list[str]) -> list[str]:
    """Scan several notes folders into one deduplicated, sorted list — the same
    note reachable from two roots (nesting/symlinks) is counted once."""
    seen: set[str] = set()
    for root in roots:
        if root and root.strip():
            seen.update(scan_vault(root, excluded=excluded))
    return sorted(seen)
