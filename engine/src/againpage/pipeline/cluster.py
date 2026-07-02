from __future__ import annotations
from dataclasses import dataclass
from againpage.core.models import Cluster, ThemeRow

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
