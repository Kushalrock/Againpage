from datetime import datetime, timezone
from uuid import uuid4
from againpage.core.models import Cluster, ThemeRow
from againpage.pipeline.cluster import diff_clusters

def _theme(h, label="Old"):
    return ThemeRow(id=uuid4(), user_id=uuid4(), label=label, centroid=[0.0]*3,
                    membership_hash=h, last_visited_at=None, created_at=datetime.now(timezone.utc))

def test_unchanged_hash_is_preserved():
    c = Cluster(member_ids=[uuid4()], centroid=[0.0]*3, membership_hash="h1")
    d = diff_clusters([c], [_theme("h1", "Stoicism")])
    assert not d.to_relabel and len(d.unchanged) == 1 and d.unchanged[0][1].label == "Stoicism"

def test_new_hash_needs_relabel():
    c = Cluster(member_ids=[uuid4()], centroid=[0.0]*3, membership_hash="h2")
    d = diff_clusters([c], [_theme("h1")])
    assert len(d.to_relabel) == 1 and not d.unchanged
