from __future__ import annotations
from dataclasses import dataclass
from againpage.core.models import Cluster, ThemeRow
from uuid import UUID
from againpage.core.scoring import centroid, membership_hash

@dataclass
class ClusterDiff:
    to_relabel: list[Cluster]
    unchanged: list[tuple[Cluster, ThemeRow]]

def diff_clusters(new: list[Cluster], existing: list[ThemeRow]) -> ClusterDiff:
    by_hash = {t.membership_hash: t for t in existing if t.membership_hash}
    to_relabel: list[Cluster] = []
    unchanged: list[tuple[Cluster, ThemeRow]] = []
    for c in new:
        match = by_hash.get(c.membership_hash)
        if match:
            unchanged.append((c, match))
        else:
            to_relabel.append(c)
    return ClusterDiff(to_relabel=to_relabel, unchanged=unchanged)

def reduce_and_cluster(embeddings: list[list[float]], ids: list[UUID], *,
                       min_cluster_size: int = 2, random_state: int = 42) -> list[Cluster]:
    if not embeddings:
        return []
    if len(embeddings) < 2 * min_cluster_size:
        return [Cluster(member_ids=list(ids), centroid=centroid(embeddings),
                        membership_hash=membership_hash(ids))]
    import numpy as np
    import umap
    import hdbscan
    X = np.array(embeddings, dtype="float32")
    n_components = min(5, X.shape[1] - 1, max(2, X.shape[0] - 2))
    reducer = umap.UMAP(n_components=n_components, random_state=random_state,
                        n_neighbors=min(15, len(embeddings) - 1), metric="cosine")
    reduced = reducer.fit_transform(X)
    labels = hdbscan.HDBSCAN(min_cluster_size=min_cluster_size).fit_predict(reduced)
    groups: dict[int, list[int]] = {}
    for idx, lab in enumerate(labels):
        if lab == -1:      # HDBSCAN noise → skip (not every note must belong to a theme)
            continue
        groups.setdefault(int(lab), []).append(idx)
    clusters: list[Cluster] = []
    for members in groups.values():
        member_ids = [ids[i] for i in members]
        clusters.append(Cluster(member_ids=member_ids,
            centroid=centroid([embeddings[i] for i in members]),
            membership_hash=membership_hash(member_ids)))
    if not clusters:       # all noise → fall back to one cluster
        clusters = [Cluster(member_ids=list(ids), centroid=centroid(embeddings),
                            membership_hash=membership_hash(ids))]
    return clusters
