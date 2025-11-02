# Enhanced Stock Fetcher with Retry and Rate Limiting
import time
from functools import wraps

def retry_with_backoff(max_retries=3, base_delay=2, max_delay=30):
    """Exponential backoff retry decorator"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            delay = base_delay
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    wait_time = min(delay * (2 ** attempt), max_delay)
                    print(f"[RETRY] Attempt {attempt + 1}/{max_retries} failed: {e}. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
            return None
        return wrapper
    return decorator


class RateLimiter:
    """Token bucket rate limiter"""
    def __init__(self, max_requests_per_second=5):
        self.max_requests = max_requests_per_second
        self.tokens = max_requests_per_second
        self.last_update = time.time()
        
    def acquire(self):
        """Wait until a token is available"""
        while True:
            now = time.time()
            elapsed = now - self.last_update
            self.tokens = min(self.max_requests, self.tokens + elapsed * self.max_requests)
            self.last_update = now
            
            if self.tokens >= 1:
                self.tokens -= 1
                return
            
            # Wait for next token
            time.sleep((1 - self.tokens) / self.max_requests)


# Usage in fetch_stocks_prices.py:
# rate_limiter = RateLimiter(max_requests_per_second=3)  # Upstox limit
# 
# @retry_with_backoff(max_retries=3)
# def fetch_batch_with_retry(url, params, headers):
#     rate_limiter.acquire()  # Respect rate limits
#     resp = upstox_get(url, params=params, headers=headers)
#     resp.raise_for_status()
#     return resp.json()
