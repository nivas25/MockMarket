"""
Stock Price Cache Service
Maintains in-memory cache of latest stock prices from WebSocket broadcasts
Used by order execution to get real-time prices without additional API calls
"""
from typing import Optional, Dict
from threading import RLock
from datetime import datetime

# In-memory cache: {stock_id: {"ltp": float, "symbol": str, "timestamp": datetime}}
_live_price_cache: Dict[int, Dict] = {}
_cache_lock = RLock()


def update_price_cache(stock_id: int, symbol: str, ltp: float):
    """
    Update the live price cache for a stock
    Called by the stock fetcher/WebSocket broadcaster
    """
    with _cache_lock:
        _live_price_cache[stock_id] = {
            "ltp": ltp,
            "symbol": symbol,
            "timestamp": datetime.now()
        }


def update_price_cache_batch(updates: list):
    """
    Update multiple prices at once (more efficient)
    updates: list of {stock_id, symbol, ltp}
    """
    with _cache_lock:
        now = datetime.now()
        for item in updates:
            stock_id = item.get("stock_id")
            if stock_id:
                _live_price_cache[stock_id] = {
                    "ltp": float(item.get("ltp", 0)),
                    "symbol": item.get("symbol", ""),
                    "timestamp": now
                }


def get_cached_price_by_stock_id(stock_id: int) -> Optional[float]:
    """
    Get the latest live price for a stock by stock_id
    Returns None if not in cache
    """
    with _cache_lock:
        entry = _live_price_cache.get(stock_id)
        if entry:
            return entry["ltp"]
        return None


def get_cached_price_by_symbol(symbol: str) -> Optional[float]:
    """
    Get the latest live price for a stock by symbol
    Returns None if not in cache
    """
    with _cache_lock:
        for entry in _live_price_cache.values():
            if entry["symbol"].upper() == symbol.upper():
                return entry["ltp"]
        return None


def get_cache_age_seconds(stock_id: int) -> Optional[float]:
    """
    Get how old the cached price is in seconds
    Returns None if not in cache
    """
    with _cache_lock:
        entry = _live_price_cache.get(stock_id)
        if entry:
            age = (datetime.now() - entry["timestamp"]).total_seconds()
            return age
        return None


def get_cache_stats() -> Dict:
    """Get statistics about the cache"""
    with _cache_lock:
        return {
            "total_stocks": len(_live_price_cache),
            "cache_keys": list(_live_price_cache.keys())[:10]  # First 10 for debugging
        }


def clear_cache():
    """Clear all cached prices (useful for testing)"""
    with _cache_lock:
        _live_price_cache.clear()
