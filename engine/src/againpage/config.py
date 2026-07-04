from __future__ import annotations
import os
from pathlib import Path


def load_env(*, extra: list[Path] | None = None) -> list[Path]:
    """Load ``KEY=VALUE`` lines from the first ``.env`` files found into
    ``os.environ`` without overriding variables already set in the real
    environment (so an exported var still wins).

    Searches, in order: the current working directory, the engine package
    root, and the repo root. Returns the list of files that were read — handy
    for logging which ``.env`` (if any) supplied the keys.

    A dependency-free loader: no python-dotenv. Ignores blank lines and
    ``#`` comments; strips surrounding single/double quotes from values.
    """
    here = Path(__file__).resolve()          # engine/src/againpage/config.py
    engine_dir = here.parents[2]             # engine/
    repo_root = here.parents[3]              # repo root
    candidates = [Path.cwd() / ".env", engine_dir / ".env", repo_root / ".env"]
    if extra:
        candidates = list(extra) + candidates

    loaded: list[Path] = []
    seen: set[Path] = set()
    for path in candidates:
        try:
            resolved = path.resolve()
            if resolved in seen or not path.is_file():
                continue
            seen.add(resolved)
            for raw in path.read_text().splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
            loaded.append(path)
        except OSError:
            continue
    return loaded
