from uuid import uuid4
from againpage.core.models import Cluster, ClusterInput

def test_cluster_and_input():
    ids = [uuid4(), uuid4()]
    c = Cluster(member_ids=ids, centroid=[0.0]*768, membership_hash="h")
    ci = ClusterInput(label="Stoicism", centroid=[0.0]*768, membership_hash="h",
                      member_ids=ids, weights={ids[0]: 1.0, ids[1]: 0.8})
    assert c.membership_hash == "h" and ci.label == "Stoicism"
