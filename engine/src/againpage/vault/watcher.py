from __future__ import annotations
import time as _time
from typing import Callable

class Debouncer:
    def __init__(self, *, delay: float, flush: Callable[[set[str]], None],
                 clock: Callable[[], float] = _time.monotonic):
        self.delay = delay
        self._flush = flush
        self._clock = clock
        self._pending: set[str] = set()
        self._last_touch: float | None = None

    def touch(self, path: str) -> None:
        self._pending.add(path)
        self._last_touch = self._clock()

    def maybe_flush(self) -> None:
        if not self._pending or self._last_touch is None:
            return
        if self._clock() - self._last_touch >= self.delay:
            paths, self._pending = self._pending, set()
            self._last_touch = None
            self._flush(paths)

def start_watcher(vault_path: str, queue, *, delay: float = 2.0):  # pragma: no cover (real FS/loop)
    import asyncio
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler

    loop = asyncio.get_event_loop()
    def flush(paths: set[str]):
        for p in paths:
            if p.endswith(".md"):
                asyncio.run_coroutine_threadsafe(queue.enqueue("ingest", {"path": p}), loop)
    deb = Debouncer(delay=delay, flush=flush)

    class Handler(FileSystemEventHandler):
        def on_any_event(self, event):
            if not event.is_directory:
                deb.touch(event.src_path)
    obs = Observer(); obs.schedule(Handler(), vault_path, recursive=True); obs.start()
    return obs, deb
