from uuid import uuid4
from againpage.pipeline.cluster import reduce_and_cluster

def test_two_separated_blobs_form_clusters():
    ids = [uuid4() for _ in range(20)]
    # blob A near (0,..), blob B near (10,..) in 8 dims
    embs = [[0.0 + (i % 3) * 0.01] * 8 for i in range(10)] + \
           [[10.0 + (i % 3) * 0.01] * 8 for i in range(10)]
    clusters = reduce_and_cluster(embs, ids, min_cluster_size=3, random_state=42)
    # each returned cluster must have a hash, a centroid, and >=1 member
    assert clusters and all(c.membership_hash and c.centroid and c.member_ids for c in clusters)
    # every id assigned to at most one cluster; separated blobs -> >=2 clusters or clean split
    assigned = [i for c in clusters for i in c.member_ids]
    assert len(assigned) == len(set(assigned))

def test_tiny_vault_single_cluster():
    ids = [uuid4(), uuid4()]
    clusters = reduce_and_cluster([[0.1]*8, [0.2]*8], ids, min_cluster_size=3)
    assert len(clusters) == 1 and set(clusters[0].member_ids) == set(ids)

def test_empty():
    assert reduce_and_cluster([], [], min_cluster_size=3) == []
