"""
Stock Price Cache Service
Maintains in-memory cache of latest stock prices from WebSocket broadcasts.
Extended to hold day_open and prev_close for real-time movers computation.
Used by order execution and gainers/losers endpoints to get real-time prices
without additional API calls or DB writes during market hours.
"""
from typing import Optional, Dict, List
from threading import RLock
from datetime import datetime

# In-memory cache: {stock_id: {"ltp": float, "symbol": str, "day_open": float|None,
#                               "prev_close": float|None, "day_high": float|None, "day_low": float|None,
#                               "timestamp": datetime}}
_live_price_cache: Dict[int, Dict] = {}
_cache_lock = RLock()


def update_price_cache(stock_id: int, symbol: str, ltp: float, day_open: Optional[float] = None, prev_close: Optional[float] = None):
    """
    Update the live price cache for a stock
    Called by the stock fetcher/WebSocket broadcaster
    """
    with _cache_lock:
        existing = _live_price_cache.get(stock_id)
        # Initialize or update rolling high/low
        if existing:
            day_high = existing.get("day_high")
            day_low = existing.get("day_low")
        else:
            day_high = None
            day_low = None

        if day_high is None or ltp > day_high:
            day_high = ltp
        if day_low is None or ltp < day_low:
            day_low = ltp

        _live_price_cache[stock_id] = {
            "ltp": ltp,
            "symbol": symbol,
            "day_open": day_open if day_open is not None else (existing.get("day_open") if existing else ltp),
            "prev_close": prev_close if prev_close is not None else (existing.get("prev_close") if existing else None),
            "day_high": day_high,
            "day_low": day_low,
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
            if not stock_id:
                continue
            ltp = float(item.get("ltp", 0))
            symbol = item.get("symbol", "")
            day_open = item.get("day_open")
            prev_close = item.get("prev_close")
            existing = _live_price_cache.get(stock_id)
            day_high = existing.get("day_high") if existing else None
            day_low = existing.get("day_low") if existing else None
            if day_high is None or ltp > day_high:
                day_high = ltp
            if day_low is None or ltp < day_low:
                day_low = ltp
            _live_price_cache[stock_id] = {
                "ltp": ltp,
                "symbol": symbol,
                "day_open": day_open if day_open is not None else (existing.get("day_open") if existing else ltp),
                "prev_close": prev_close if prev_close is not None else (existing.get("prev_close") if existing else None),
                "day_high": day_high,
                "day_low": day_low,
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


def get_all_cached_prices() -> List[Dict]:
    """Return a snapshot list of all cached price entries.
    Each entry includes symbol, ltp, day_open, prev_close, stock_id and timestamp.
    """
    with _cache_lock:
        result = []
        for stock_id, data in _live_price_cache.items():
            entry = {
                "stock_id": stock_id,
                "symbol": data.get("symbol"),
                "ltp": data.get("ltp"),
                "day_open": data.get("day_open"),
                "prev_close": data.get("prev_close"),
                "day_high": data.get("day_high"),
                "day_low": data.get("day_low"),
                "timestamp": data.get("timestamp"),
            }
            result.append(entry)
        return result

def get_day_ohlc(stock_id: int) -> Optional[Dict]:
    """Return current in-memory day OHLC for a stock_id."""
    with _cache_lock:
        data = _live_price_cache.get(stock_id)
        if not data:
            return None
        return {
            "open": data.get("day_open"),
            "high": data.get("day_high"),
            "low": data.get("day_low"),
            "close": data.get("ltp"),
            "prev_close": data.get("prev_close"),
            "timestamp": data.get("timestamp"),
            "symbol": data.get("symbol"),
        }
