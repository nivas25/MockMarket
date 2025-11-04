"""
In-memory caching service for high-frequency, low-mutation data.
Reduces DB load and improves response times for movers, news, sentiment.
"""
from typing import Any, Optional, Dict, Callable
from datetime import datetime, timedelta
import threading
import time
import logging
import os

logger = logging.getLogger(__name__)
# Only show cache operations in DEBUG mode
DEBUG_CACHE = os.getenv("DEBUG_CACHE", "false").lower() == "true"


class CacheEntry:
    """Thread-safe cache entry with expiration and optional stale window"""
    def __init__(self, value: Any, ttl_seconds: int, stale_ttl_seconds: int | None = None):
        self.value = value
        now = datetime.now()
        self.expires_at = now + timedelta(seconds=ttl_seconds)
        # During stale window, we can return stale value while refreshing in background
        self.stale_expires_at = (
            (now + timedelta(seconds=ttl_seconds + (stale_ttl_seconds or 0)))
            if stale_ttl_seconds is not None else None
        )
        self.lock = threading.RLock()

    def is_expired(self) -> bool:
        with self.lock:
            return datetime.now() > self.expires_at

    def is_stale_allowed(self) -> bool:
        with self.lock:
            if self.stale_expires_at is None:
                return False
            return datetime.now() <= self.stale_expires_at

    def get(self) -> Optional[Any]:
        with self.lock:
            if self.is_expired():
                return None
            return self.value


class SimpleCache:
    """
    Thread-safe in-memory cache with TTL.
    Ideal for caching API responses that update infrequently during market hours.
    """
    def __init__(self):
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = threading.RLock()
    
    def get(self, key: str) -> Optional[Any]:
        """Retrieve cached value if not expired"""
        with self._lock:
            entry = self._cache.get(key)
            if entry is None:
                return None
            
            value = entry.get()
            if value is None:
                # Expired, clean up
                del self._cache[key]
            return value
    
    def set(self, key: str, value: Any, ttl_seconds: int = 60, stale_ttl_seconds: int | None = None):
        """Cache a value with TTL and optional stale window (default TTL=60s)"""
        with self._lock:
            self._cache[key] = CacheEntry(value, ttl_seconds, stale_ttl_seconds)
    
    def delete(self, key: str):
        """Remove a key from cache"""
        with self._lock:
            self._cache.pop(key, None)
    
    def clear(self):
        """Clear entire cache"""
        with self._lock:
            self._cache.clear()
    
    def get_or_compute(
        self,
        key: str,
        compute_fn: Callable[[], Any],
        ttl_seconds: int = 60
    ) -> Any:
        """
        Get from cache or compute and cache the result.
        Thread-safe single-flight pattern to prevent stampede.
        """
        # Try cache first
        cached = self.get(key)
        if cached is not None:
            if DEBUG_CACHE:
                logger.debug(f"Cache hit: {key}")
            return cached
        
        # Compute with lock to prevent multiple concurrent computations
        with self._lock:
            # Double-check after acquiring lock
            cached = self.get(key)
            if cached is not None:
                if DEBUG_CACHE:
                    logger.debug(f"Cache hit (after lock): {key}")
                return cached
            
            # Compute and cache
            if DEBUG_CACHE:
                logger.debug(f"Cache miss - computing: {key}")
            result = compute_fn()
            self.set(key, result, ttl_seconds)
            return result

    def get_or_compute_stale(
        self,
        key: str,
        compute_fn: Callable[[], Any],
        ttl_seconds: int = 60,
        stale_ttl_seconds: int = 120,
    ) -> Any:
        """
        Serve stale-while-revalidate:
        - If fresh: return cached
        - If expired but within stale window: return stale immediately and refresh in background
        - If no cache or stale window passed: compute synchronously
        """
        with self._lock:
            entry = self._cache.get(key)
            if entry is not None:
                val = entry.get()
                if val is not None:
                    if DEBUG_CACHE:
                        logger.debug(f"Cache hit: {key}")
                    return val
                # expired but possibly within stale window
                if entry.is_stale_allowed() and entry.value is not None:
                    if DEBUG_CACHE:
                        logger.debug(f"Cache stale - serving stale and refreshing: {key}")
                    stale_val = entry.value

                    # Background refresh
                    def _refresh():
                        try:
                            result = compute_fn()
                            self.set(key, result, ttl_seconds, stale_ttl_seconds)
                        except Exception as e:
                            # Keep stale if refresh fails
                            logger.error(f"Cache refresh error for {key}: {e}")

                    threading.Thread(target=_refresh, daemon=True).start()
                    return stale_val

        # No entry or stale window passed; compute synchronously
        if DEBUG_CACHE:
            logger.debug(f"Cache miss - computing: {key}")
        result = compute_fn()
        self.set(key, result, ttl_seconds, stale_ttl_seconds)
        return result


# Global cache instance
_cache = SimpleCache()


def get_cache() -> SimpleCache:
    """Get the global cache instance"""
    return _cache


# Background cleanup thread (optional, runs every 5 minutes)
def _cleanup_expired():
    """Remove expired entries to free memory"""
    while True:
        time.sleep(300)  # 5 minutes
        cache = get_cache()
        with cache._lock:
            expired_keys = [
                k for k, entry in cache._cache.items()
                if entry.is_expired()
            ]
            for k in expired_keys:
                cache._cache.pop(k, None)


_cleanup_thread = threading.Thread(target=_cleanup_expired, daemon=True)
_cleanup_thread.start()
