from againpage.scheduler.sync import sync_due

def test_sync_due():
    assert sync_due(0, 10_000) is False                 # off
    assert sync_due(30, 29 * 60) is False               # not yet
    assert sync_due(30, 30 * 60) is True                # due
    assert sync_due(15, 30 * 60) is True                # clamped to 30, elapsed 30m
    assert sync_due(15, 29 * 60) is False               # clamped to 30, elapsed 29m
