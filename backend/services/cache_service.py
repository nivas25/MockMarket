"""
In-memory caching service for high-frequency, low-mutation data.
Reduces DB load and improves response times for movers, news, sentiment.
"""
from typing import Any, Optional, Dict, Callable
from datetime import datetime, timedelta
import threading
import time


class CacheEntry:
    """Thread-safe cache entry with expiration"""
    def __init__(self, value: Any, ttl_seconds: int):
        self.value = value
        self.expires_at = datetime.now() + timedelta(seconds=ttl_seconds)
        self.lock = threading.RLock()
    
    def is_expired(self) -> bool:
        with self.lock:
            return datetime.now() > self.expires_at
    
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
    
    def set(self, key: str, value: Any, ttl_seconds: int = 60):
        """Cache a value with TTL (default 60s)"""
        with self._lock:
            self._cache[key] = CacheEntry(value, ttl_seconds)
    
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
            print(f"[CACHE HIT] {key}")
            return cached
        
        # Compute with lock to prevent multiple concurrent computations
        with self._lock:
            # Double-check after acquiring lock
            cached = self.get(key)
            if cached is not None:
                print(f"[CACHE HIT] {key} (after lock)")
                return cached
            
            # Compute and cache
            print(f"[CACHE MISS] {key} - computing...")
            result = compute_fn()
            self.set(key, result, ttl_seconds)
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
