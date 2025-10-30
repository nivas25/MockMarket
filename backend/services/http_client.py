import random
import time
from typing import Dict, Optional

import requests
import certifi

from utils.pretty_log import status_warn, status_err
from services.metrics import metrics


DEFAULT_TIMEOUT = 10


def _sleep_backoff(attempt: int, base: float = 1.0, cap: float = 8.0) -> None:
    # Exponential backoff with jitter
    delay = min(cap, base * (2 ** (attempt - 1)))
    jitter = random.uniform(0, 0.3)
    time.sleep(delay + jitter)


def upstox_get(
    url: str,
    *,
    headers: Optional[Dict[str, str]] = None,
    params: Optional[Dict[str, str]] = None,
    timeout: int = DEFAULT_TIMEOUT,
    max_retries: int = 3,
    label: str = "upstox_rest",
) -> requests.Response:
    """GET wrapper for Upstox REST with basic retries/backoff and metrics.

    - Counts every HTTP attempt
    - Retries 429 and 5xx with exponential backoff
    - Returns Response or raises the last exception
    """
    last_err = None
    for attempt in range(1, max_retries + 1):
        metrics.record_call(label)
        try:
            resp = requests.get(
                url,
                headers=headers,
                params=params,
                timeout=timeout,
                verify=certifi.where(),  # avoid broken env pointing to invalid cert bundle
            )
            # Fast path
            if resp.status_code < 400:
                return resp

            # Handle 429 and 5xx with retry
            if resp.status_code == 429:
                metrics.record_429(label)
                if attempt < max_retries:
                    status_warn(f"Upstox 429 rate limit. Retrying attempt {attempt+1}/{max_retries}...")
                    metrics.record_retry(label)
                    _sleep_backoff(attempt)
                    continue
            elif 500 <= resp.status_code < 600 and attempt < max_retries:
                status_warn(f"Upstox {resp.status_code} server error. Retrying {attempt+1}/{max_retries}...")
                metrics.record_retry(label)
                _sleep_backoff(attempt)
                continue

            # Non-retryable or last attempt
            resp.raise_for_status()
            return resp  # pragma: no cover (raise_for_status would have raised)

        except requests.RequestException as e:
            last_err = e
            if attempt < max_retries:
                status_warn(f"Upstox request error: {e}. Retrying {attempt+1}/{max_retries}...")
                metrics.record_retry(label)
                _sleep_backoff(attempt)
                continue
            status_err(f"Upstox request failed after {max_retries} attempts: {e}")
            raise

    # If loop exits without return, raise last_err
    if last_err:
        raise last_err
    raise RuntimeError("upstox_get: unknown error")
