from uuid import UUID
from againpage.core.scoring import membership_hash, centroid

A = UUID(int=1); B = UUID(int=2); C = UUID(int=3)

def test_hash_is_order_independent():
    assert membership_hash([A, B, C]) == membership_hash([C, A, B])

def test_hash_changes_on_membership_change():
    assert membership_hash([A, B]) != membership_hash([A, B, C])

def test_centroid_is_mean():
    assert centroid([[0.0, 2.0], [2.0, 0.0]]) == [1.0, 1.0]
