def clamp_sync_interval(minutes: int) -> int:
    """Allowed values: 0 (periodic off) or an integer >= 30. Anything 1..29
    clamps up to 30; <=0 is off."""
    m = int(minutes)
    if m <= 0:
        return 0
    return max(30, m)

def sync_due(interval_minutes: int, seconds_since_last: float) -> bool:
    """True when the periodic auto-index should fire: interval enabled (>=30
    after clamp) and at least that many minutes have elapsed."""
    iv = clamp_sync_interval(interval_minutes)
    return iv > 0 and seconds_since_last >= iv * 60
