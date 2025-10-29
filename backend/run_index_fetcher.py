"""
Standalone runner for index fetcher.
Run this from the backend/ directory root:
    python run_index_fetcher.py
"""
import sys
import os

# Ensure backend root is in sys.path
backend_root = os.path.dirname(os.path.abspath(__file__))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from controller.fetch.index_fetch.fetch_indices import run_continuous_fetch

if __name__ == "__main__":
    # Default 120s interval, override via arg if needed
    interval = int(sys.argv[1]) if len(sys.argv) > 1 else 120
    run_continuous_fetch(interval_seconds=interval)
