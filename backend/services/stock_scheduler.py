import threading
import time

from utils.pretty_log import banner, status_err, status_ok
from controller.fetch.stock_prices_fetch.fetch_stocks_prices import (
    fetch_all_stock_prices,
)

_SCHEDULER_STARTED = False


def _runner(interval: int):
    banner(
        "Stock Price Fetcher Running (In-Process)",
        f"Every {interval}s",
        style="bold magenta",
    )
    while True:
        try:
            fetch_all_stock_prices()
        except Exception as e:
            status_err(f"Background stock fetch error: {e}")
        # Be a good citizen between cycles
        try:
            time.sleep(interval)
        except Exception:
            pass


def start_stock_scheduler(interval_seconds: int = 120):
    """Start the in-process stock price fetch scheduler (idempotent)."""
    global _SCHEDULER_STARTED
    if _SCHEDULER_STARTED:
        status_ok("Stock scheduler already running")
        return
    t = threading.Thread(target=_runner, args=(interval_seconds,), daemon=True)
    t.start()
    _SCHEDULER_STARTED = True
    status_ok(f"Stock scheduler started (every {interval_seconds}s)")
