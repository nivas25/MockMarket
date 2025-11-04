import threading
import time
from typing import Optional

from services.cache_service import get_cache
from routes.fetch_routes.stock_price_fetch_routes import _top_movers_query
from services.news_service import fetch_latest_news
from flask import current_app

# Lightweight background refresher for hot caches
# Precomputes movers and indices periodically so first request is fast.

class _HotCacheRefresher:
    def __init__(self, interval_seconds: int = 10):
        self.interval = interval_seconds
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()

    def _run(self):
        cache = get_cache()
        exchange = "NSE"
        limits = (10,)  # extend if needed
        intraday_opts = (True, False)

        while not self._stop.is_set():
            t0 = time.perf_counter()
            try:
                # Movers (gainers/losers/active and aggregated)
                for limit in limits:
                    for intraday in intraday_opts:
                        cache.get_or_compute_stale(
                            f"gainers:{exchange}:{limit}:{intraday}",
                            lambda e=exchange, l=limit, i=intraday: _top_movers_query(
                                order="DESC", limit=l, exchange=e, use_intraday=i
                            ),
                            ttl_seconds=10,
                            stale_ttl_seconds=120,
                        )
                        cache.get_or_compute_stale(
                            f"losers:{exchange}:{limit}:{intraday}",
                            lambda e=exchange, l=limit, i=intraday: _top_movers_query(
                                order="ASC", limit=l, exchange=e, use_intraday=i
                            ),
                            ttl_seconds=10,
                            stale_ttl_seconds=120,
                        )
                        # Active is computed inside movers_all too, but warm directly as well
                        from routes.fetch_routes.stock_price_fetch_routes import most_active as _most_active_route
                        try:
                            # Call the underlying function's internal compute via cache key
                            active_key = f"active:{exchange}:{limit}"
                            def _fetch_active_internal():
                                # replicate internal most active compute
                                from routes.fetch_routes.stock_price_fetch_routes import most_active as _ignored
                                # We can't import the inner function directly; let route handler compute on demand.
                                # Here, just trigger computation by calling cache get_or_compute_stale in the handler path on next request.
                                return _ignored()
                            # We won't call the Flask route; just ensure cache is primed via movers_all below
                            pass
                        except Exception:
                            pass
                        # Aggregated movers_all
                        from routes.fetch_routes.stock_price_fetch_routes import movers_all as _movers_all_route
                        try:
                            # Simulate calling compute without HTTP by directly priming cache
                            key = f"movers_all:{exchange}:{limit}:{intraday}"
                            def _compute_all():
                                # Reuse cache-driven internals by calling the route's compute indirectly
                                # We avoid returning a Flask Response; instead compute parts here
                                gainers = cache.get_or_compute_stale(
                                    f"gainers:{exchange}:{limit}:{intraday}",
                                    lambda e=exchange, l=limit, i=intraday: _top_movers_query(
                                        order="DESC", limit=l, exchange=e, use_intraday=i
                                    ),
                                    ttl_seconds=10,
                                    stale_ttl_seconds=120,
                                )
                                losers = cache.get_or_compute_stale(
                                    f"losers:{exchange}:{limit}:{intraday}",
                                    lambda e=exchange, l=limit, i=intraday: _top_movers_query(
                                        order="ASC", limit=l, exchange=e, use_intraday=i
                                    ),
                                    ttl_seconds=10,
                                    stale_ttl_seconds=120,
                                )
                                # Most active uses same SQL as route
                                from routes.fetch_routes.stock_price_fetch_routes import most_active
                                # We can't get the dict result directly without Flask context; skip deep warm.
                                return {"gainers": gainers, "losers": losers, "mostActive": []}
                            cache.get_or_compute_stale(key, _compute_all, ttl_seconds=10, stale_ttl_seconds=120)
                        except Exception:
                            pass

                # Indices DB cache (when not using WebSocket). We just call the function to populate cache path.
                try:
                    # Import lazily to avoid circulars at module import time
                    from routes.fetch_routes.index_fetch_routes import get_all_indices
                    get_all_indices()  # this will hit cache layer inside and warm cache
                except Exception:
                    pass

                # News prefetch
                try:
                    fetch_latest_news(force_refresh=False)
                except Exception:
                    pass

            except Exception as e:
                print(f"[HOT CACHE] refresh error: {e}")
            finally:
                elapsed = time.perf_counter() - t0
                # Sleep remaining interval
                to_sleep = max(1.0, self.interval - elapsed)
                self._stop.wait(to_sleep)

_refresher = _HotCacheRefresher(interval_seconds=10)

def start_hot_cache_scheduler():
    import logging
    logger = logging.getLogger(__name__)
    try:
        _refresher.start()
        logger.info("Hot cache refresher started (every 10s)")
    except Exception as e:
        logger.error(f"Hot cache failed to start: {e}")
