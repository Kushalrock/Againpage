from againpage.vault.watcher import Debouncer

def test_debouncer_coalesces_until_delay_elapses():
    now = {"t": 0.0}
    flushed: list[set] = []
    d = Debouncer(delay=2.0, flush=lambda paths: flushed.append(set(paths)), clock=lambda: now["t"])
    d.touch("a.md"); now["t"] = 0.5; d.touch("b.md")
    d.maybe_flush()                      # only 0.5s passed → no flush
    assert flushed == []
    now["t"] = 3.0; d.maybe_flush()      # 2.5s since last touch → flush both
    assert flushed == [{"a.md", "b.md"}]
    d.maybe_flush()                      # nothing pending
    assert len(flushed) == 1
