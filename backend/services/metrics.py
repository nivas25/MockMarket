import threading
import time
from collections import deque, defaultdict


class _RollingCounter:
    """Thread-safe rolling window counters per label.

    Keeps timestamps (epoch seconds) in deques and purges outside windows on read.
    """

    def __init__(self):
        self._lock = threading.RLock()
        self._events = defaultdict(deque)  # label -> deque[timestamps]
        self._events_429 = defaultdict(deque)
        self._retries = defaultdict(deque)

    def _purge(self, dq: deque, window_seconds: int) -> None:
        cutoff = time.time() - window_seconds
        while dq and dq[0] < cutoff:
            dq.popleft()

    def record_call(self, label: str) -> None:
        with self._lock:
            self._events[label].append(time.time())

    def record_429(self, label: str) -> None:
        with self._lock:
            self._events_429[label].append(time.time())

    def record_retry(self, label: str) -> None:
        with self._lock:
            self._retries[label].append(time.time())

    def get_stats(self, label: str) -> dict:
        with self._lock:
            dq = self._events[label]
            dq_429 = self._events_429[label]
            dq_retry = self._retries[label]
            # Purge old
            for d in (dq, dq_429, dq_retry):
                self._purge(d, 1800)  # maintain last 30m only

            now = time.time()
            one_min = now - 60
            thirty_min = now - 1800

            calls_last_min = sum(1 for t in dq if t >= one_min)
            calls_last_30m = sum(1 for t in dq if t >= thirty_min)
            http429_last_30m = sum(1 for t in dq_429 if t >= thirty_min)
            retries_last_30m = sum(1 for t in dq_retry if t >= thirty_min)

            return {
                "calls_last_min": calls_last_min,
                "calls_last_30m": calls_last_30m,
                "http429_last_30m": http429_last_30m,
                "retries_last_30m": retries_last_30m,
            }


# Singleton instance used across the app
metrics = _RollingCounter()
