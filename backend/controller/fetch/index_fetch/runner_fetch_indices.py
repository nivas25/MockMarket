"""
Runner script to start the index price fetcher.
This runs the fetcher continuously in the background.
"""
import sys
import os

# Add parent directories to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from controller.fetch.index_fetch.fetch_indices import run_continuous_fetch

if __name__ == "__main__":
    print("[📊] Starting Index Price Fetcher...")
    run_continuous_fetch(interval_seconds=120)
