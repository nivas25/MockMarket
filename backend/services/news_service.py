import time
from typing import List, Dict, Any, Optional
import socket

import feedparser
import re
from html import unescape

def _with_socket_timeout(timeout: float):
    """Temporarily set the global socket timeout inside a context."""
    prev = socket.getdefaulttimeout()
    socket.setdefaulttimeout(timeout)
    try:
        yield
    finally:
        socket.setdefaulttimeout(prev)


# Simple in-memory cache to avoid hitting feeds too often
_CACHE: Dict[str, Any] = {
    "timestamp": 0.0,
    "items": [],
}

# Mock news data as fallback when RSS feeds fail/timeout
MOCK_NEWS = [
    {
        "headline": "Nifty 50 reaches new all-time high amid strong buying",
        "source": "Market Update",
        "summary": "Indian benchmark indices hit record highs with strong momentum across sectors",
        "timestamp": None,
        "imageUrl": None,
        "url": None,
        "category": "Markets",
    },
    {
        "headline": "FII inflows surge as India remains attractive investment destination",
        "source": "Market Update", 
        "summary": "Foreign institutional investors continue to pour money into Indian markets",
        "timestamp": None,
        "imageUrl": None,
        "url": None,
        "category": "Markets",
    },
    {
        "headline": "Banking stocks rally on strong quarterly results",
        "source": "Market Update",
        "summary": "Major banking stocks see significant gains following better-than-expected earnings",
        "timestamp": None,
        "imageUrl": None,
        "url": None,
        "category": "Markets",
    },
    {
        "headline": "IT sector shows resilience amid global uncertainty",
        "source": "Market Update",
        "summary": "Technology stocks maintain upward trend with robust order books",
        "timestamp": None,
        "imageUrl": None,
        "url": None,
        "category": "Markets",
    },
    {
        "headline": "RBI maintains repo rate, focuses on inflation control",
        "source": "Market Update",
        "summary": "Central bank keeps interest rates unchanged in latest monetary policy review",
        "timestamp": None,
        "imageUrl": None,
        "url": None,
        "category": "Markets",
    },
]

# RSS sources focused on Indian markets/business; feel free to tweak
RSS_SOURCES = [
    {
        "name": "Moneycontrol - Latest",
        "url": "https://www.moneycontrol.com/rss/latestnews.xml",
    },
    # Temporarily disabled slow feeds
    # {
    #     "name": "Economic Times - Markets",
    #     "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
    # },
    # {
    #     "name": "Reuters India - Business News",
    #     "url": "https://feeds.reuters.com/reuters/INbusinessNews",
    # },
    # {
    #     "name": "Business Standard - Markets",
    #     "url": "https://www.business-standard.com/rss/markets-106.rss",
    # },
]


def _strip_html(text: str) -> str:
    if not text:
        return ""
    # crude tag remover
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _normalize_entry(src_name: str, e: Any) -> Dict[str, Any]:
    title = getattr(e, "title", None) or e.get("title") or ""
    link = getattr(e, "link", None) or e.get("link") or None
    summary = getattr(e, "summary", None) or e.get("summary") or ""
    published = (
        getattr(e, "published", None)
        or getattr(e, "updated", None)
        or e.get("published")
        or e.get("updated")
        or None
    )

    # Try media content for image
    image_url: Optional[str] = None
    media_content = e.get("media_content") or e.get("media_thumbnail") or []
    if isinstance(media_content, list) and media_content:
        image_obj = media_content[0]
        image_url = image_obj.get("url")

    return {
        "headline": title.strip(),
        "source": src_name,
        "summary": _strip_html(summary)[:400] if summary else None,
        "timestamp": published,
        "imageUrl": image_url,
        "url": link,
        "category": "Markets",
    }


def fetch_latest_news(force_refresh: bool = False, ttl_seconds: int = 300) -> List[Dict[str, Any]]:
    now = time.time()
    
    # Return cached items if available and fresh
    if not force_refresh and _CACHE["items"] and (now - _CACHE["timestamp"]) < ttl_seconds:
        print(f"[NEWS] Serving from cache ({len(_CACHE['items'])} items)")
        return _CACHE["items"]

    # Try to fetch from RSS, but return mock data on any error/timeout
    try:
        print(f"[NEWS] Fetching fresh news from {len(RSS_SOURCES)} sources...")
        items: List[Dict[str, Any]] = []

        # Use a bounded socket timeout only during RSS fetches to avoid affecting server sockets
        from contextlib import contextmanager

        @contextmanager
        def _timeout_ctx():
            prev = socket.getdefaulttimeout()
            socket.setdefaulttimeout(5)
            try:
                yield
            finally:
                socket.setdefaulttimeout(prev)

        with _timeout_ctx():
            for src in RSS_SOURCES:
                try:
                    print(f"[NEWS] Fetching from {src['name']}...")
                    parsed = feedparser.parse(src["url"])  # timeout enforced by context
                    entries_found = len(parsed.entries)
                    print(f"[NEWS] Found {entries_found} entries from {src['name']}")
                    
                    # Check for bozo (feed parsing errors)
                    if hasattr(parsed, 'bozo') and parsed.bozo:
                        print(f"[NEWS] Warning: Feed parse error from {src['name']}: {getattr(parsed, 'bozo_exception', 'Unknown error')}")
                    
                    for e in parsed.entries[:20]:  # cap per source to keep it light
                        items.append(_normalize_entry(src["name"], e))
                except Exception as exc:
                    print(f"[NEWS] Error fetching {src['name']}: {exc}")
                    # skip failing feed, don't print full traceback
                    continue

        print(f"[NEWS] Total items before dedup: {len(items)}")
        
        # If we got items, dedupe and cache them
        if items:
            # De-dupe by URL/title pair, keep order
            seen = set()
            unique_items: List[Dict[str, Any]] = []
            for it in items:
                key = (it.get("url"), it.get("headline"))
                if key in seen:
                    continue
                seen.add(key)
                unique_items.append(it)

            print(f"[NEWS] Unique items after dedup: {len(unique_items)}")
            _CACHE["items"] = unique_items
            _CACHE["timestamp"] = now
            return unique_items
        else:
            # RSS failed, return mock data
            print(f"[NEWS] RSS feeds returned no data, using mock news")
            return MOCK_NEWS
            
    except Exception as e:
        print(f"[NEWS] RSS fetch failed: {e}, using mock news")
        return MOCK_NEWS
