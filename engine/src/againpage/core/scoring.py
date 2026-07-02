from __future__ import annotations
import hashlib
from uuid import UUID

def membership_hash(ids: list[UUID]) -> str:
    joined = ",".join(sorted(str(i) for i in ids))
    return hashlib.sha256(joined.encode()).hexdigest()

def centroid(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        return []
    n = len(vectors)
    dim = len(vectors[0])
    return [sum(v[i] for v in vectors) / n for i in range(dim)]
