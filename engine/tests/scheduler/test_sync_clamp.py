from againpage.scheduler.sync import clamp_sync_interval

def test_clamp():
    assert clamp_sync_interval(0) == 0
    assert clamp_sync_interval(-5) == 0
    assert clamp_sync_interval(1) == 30
    assert clamp_sync_interval(29) == 30
    assert clamp_sync_interval(30) == 30
    assert clamp_sync_interval(90) == 90
