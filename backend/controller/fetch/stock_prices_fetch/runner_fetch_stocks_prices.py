#!/usr/bin/env python3
"""
Runner for stock price fetcher with continuous updates.
Usage: From backend/ directory, run:
    uv run -m controller.fetch.stock_prices_fetch.runner_fetch_stocks_prices
or:
    python -m controller.fetch.stock_prices_fetch.runner_fetch_stocks_prices
"""

if __name__ == "__main__":
    from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
    import time

    print("[🚀] Starting continuous stock price fetching...")
    
    while True:
        try:
            fetch_all_stock_prices()
            print(f"[⏰] Next update in 120 seconds...\n")
            time.sleep(120)
        except KeyboardInterrupt:
            print("\n[!] Stopping stock fetcher...")
            break
        except Exception as e:
            print(f"[!] Unexpected error: {e}")
            print(f"[⏰] Retrying in 120 seconds...")
            time.sleep(120)
