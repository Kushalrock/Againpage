from againpage.vault.watcher import Debouncer

def test_debouncer_flushes_batched_paths_after_delay():
    flushed = []
    t = {"now": 0.0}
    deb = Debouncer(delay=2.0, flush=lambda paths: flushed.append(paths), clock=lambda: t["now"])
    deb.touch("a.md"); deb.touch("b.md")
    t["now"] = 1.0; deb.maybe_flush()              # before delay → no flush
    assert flushed == []
    t["now"] = 2.0; deb.maybe_flush()              # at delay → one flush, batched
    assert flushed == [{"a.md", "b.md"}]
    deb.maybe_flush()                              # nothing pending → no extra flush
    assert len(flushed) == 1

def test_debouncer_noop_when_empty():
    deb = Debouncer(delay=1.0, flush=lambda p: (_ for _ in ()).throw(AssertionError("should not flush")),
                    clock=lambda: 0.0)
    deb.maybe_flush()   # no touches → no flush, no error
