from __future__ import annotations
import hashlib
import math
import random as _random
from datetime import datetime
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

def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)); nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)

def _days(a: datetime, b: datetime) -> float:
    return abs((b - a).total_seconds()) / 86400.0

def recency_decay(last, now: datetime, *, half_life_days: float = 30.0) -> float:
    """0..1, higher when LESS recently visited (staler theme)."""
    if last is None:
        return 1.0
    return 1.0 - 0.5 ** (_days(last, now) / half_life_days)

def staleness(last_surfaced, now: datetime, *, interval_days: float = 21.0) -> float:
    """>=0, grows as a note drifts past its review interval; never surfaced → maximal."""
    if last_surfaced is None:
        return 1.0
    return max(0.0, _days(last_surfaced, now) / interval_days)

def link_penalty(created_at, last_seen_at, note_updated_at, now: datetime):
    if created_at is None and last_seen_at is None:
        return 0.0, "discovery"
    recent_ref = max(d for d in [last_seen_at, note_updated_at] if d is not None) \
        if any(d is not None for d in [last_seen_at, note_updated_at]) else None
    if recent_ref is not None and _days(recent_ref, now) <= 30:
        return 1.0, "excluded"
    # linked but stale → reminder; penalty decays with age of the link
    age = _days(created_at or last_seen_at, now)
    penalty = max(0.05, 0.5 * 0.5 ** (age / 180.0))
    return penalty, "reminder"

def unsurfaced_fraction(member_ids, surfaced: dict) -> float:
    if not member_ids:
        return 0.0
    unseen = sum(1 for i in member_ids if surfaced.get(i) is None)
    return unseen / len(member_ids)

def weighted_sample(items, weights, rng: _random.Random):
    total = sum(weights)
    if total <= 0:
        return rng.choice(items)
    r = rng.random() * total
    acc = 0.0
    for it, w in zip(items, weights):
        acc += w
        if r <= acc:
            return it
    return items[-1]
