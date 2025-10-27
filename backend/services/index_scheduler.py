import threading
import time
from utils.pretty_log import banner, status_err
from controller.fetch.index_fetch.fetch_indices import update_index_prices

_SCHEDULER_STARTED = False


def _runner(interval: int):
    banner("Index Fetcher Running (In-Process)", f"Every {interval}s", style="bold magenta")
    while True:
        try:
            update_index_prices()
        except Exception as e:
            status_err(f"Background fetch error: {e}")
        time.sleep(interval)


def start_index_scheduler(interval_seconds: int = 120):
    global _SCHEDULER_STARTED
    if _SCHEDULER_STARTED:
        return
    t = threading.Thread(target=_runner, args=(interval_seconds,), daemon=True)
    t.start()
    _SCHEDULER_STARTED = True
