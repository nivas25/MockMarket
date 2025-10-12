import pprint
from scheduler import fetch_all_instruments, fetch_live_prices

if __name__ == '__main__':
    print("--- Testing Data Fetcher Functions ---")

    # Fetch all NSE stock instruments
    print("\n[TEST] Fetching all instruments...")
    all_stocks = fetch_all_instruments()

    if not all_stocks:
        print("[TEST] Failed: No instruments fetched. Check logs for errors.")
    else:
        print(f"[TEST] Success: Fetched {len(all_stocks)} instruments.")
        print("\n--- [OUTPUT 1] Sample Stock Data (first 5) ---")
        pprint.pprint(all_stocks[:5], indent=2)

        # Select keys for price tracking (limit to 5 to avoid rate limits)
        keys_to_track = [stock['instrument_key'] for stock in all_stocks[:5]]
        print(f"\n[TEST] Fetching prices for {len(keys_to_track)} stocks: {keys_to_track}")

        # Fetch live prices
        live_prices = fetch_live_prices(keys_to_track)

        if not live_prices:
            print("[TEST] Failed: No price data fetched. Check logs for errors.")
        else:
            print(f"[TEST] Success: Fetched prices for {len(live_prices)} instruments.")
            print("\n--- [OUTPUT 2] Live Price Data ---")
            pprint.pprint(live_prices, indent=2)

    print("\n--- Test Complete ---")