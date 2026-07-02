import random
from datetime import datetime, timedelta, timezone
from uuid import UUID
from againpage.core.scoring import (cosine, recency_decay, staleness,
    link_penalty, unsurfaced_fraction, weighted_sample)

NOW = datetime(2026, 6, 30, tzinfo=timezone.utc)

def test_cosine():
    assert abs(cosine([1, 0], [1, 0]) - 1.0) < 1e-9
    assert abs(cosine([1, 0], [0, 1]) - 0.0) < 1e-9

def test_recency_decay_higher_for_older():
    recent = recency_decay(NOW - timedelta(days=1), NOW)
    old = recency_decay(NOW - timedelta(days=120), NOW)
    never = recency_decay(None, NOW)
    assert old > recent and never >= old

def test_staleness_grows_past_interval():
    assert staleness(NOW - timedelta(days=42), NOW, interval_days=21) > \
           staleness(NOW - timedelta(days=10), NOW, interval_days=21)
    assert staleness(None, NOW) >= 1.0   # never surfaced → maximally overdue

def test_link_penalty_flavors():
    # no link → discovery, penalty 0
    p, f = link_penalty(None, None, None, NOW); assert f == "discovery" and p == 0.0
    # old link, nothing recent → reminder, low penalty
    p, f = link_penalty(NOW - timedelta(days=400), NOW - timedelta(days=400),
                        NOW - timedelta(days=400), NOW); assert f == "reminder" and 0 < p < 1
    # recently active link → excluded, high penalty
    p, f = link_penalty(NOW - timedelta(days=5), NOW - timedelta(days=2),
                        NOW - timedelta(days=1), NOW); assert f == "excluded"

def test_unsurfaced_fraction():
    a, b, c = UUID(int=1), UUID(int=2), UUID(int=3)
    assert unsurfaced_fraction([a, b, c], {a: NOW}) == 2 / 3

def test_weighted_sample_is_deterministic_with_seed():
    rng = random.Random(1)
    picks = [weighted_sample(["a", "b", "c"], [0.0, 0.0, 1.0], rng) for _ in range(5)]
    assert picks == ["c"] * 5   # all weight on c
