"""
Standalone runner for stock price fetcher.
Run this from the backend/ directory root:
    python run_stock_fetcher.py
"""
import sys
import os

# Ensure backend root is in sys.path
backend_root = os.path.dirname(os.path.abspath(__file__))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
import time

if __name__ == "__main__":
    print("🚀 Starting Stock Price Fetcher (every 120s)")
    print("Press Ctrl+C to stop\n")
    
    while True:
        try:
            fetch_all_stock_prices()
            print(f"\n⏰ Next update in 120 seconds...")
            time.sleep(120)
        except KeyboardInterrupt:
            print("\n\n✅ Stock fetcher stopped by user")
            break
        except Exception as e:
            print(f"\n❌ Unexpected error: {e}")
            print(f"⏰ Retrying in 120 seconds...")
            time.sleep(120)
