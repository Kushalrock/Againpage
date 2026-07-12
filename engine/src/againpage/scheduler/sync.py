def clamp_sync_interval(minutes: int) -> int:
    """Allowed values: 0 (periodic off) or an integer >= 30. Anything 1..29
    clamps up to 30; <=0 is off."""
    m = int(minutes)
    if m <= 0:
        return 0
    return max(30, m)
