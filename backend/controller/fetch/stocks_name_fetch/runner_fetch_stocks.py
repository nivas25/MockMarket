import pprint
from fetch_stocks import fetch_all_instruments
from update_stocks_db import update_stocks_table

if __name__ == '__main__':
    print("--- Testing Data Fetcher Functions ---")

    # Fetch all NSE stock instruments
    print("\n[TEST] Fetching all instruments...")
    all_stocks = fetch_all_instruments()

    if not all_stocks:
        print("[TEST] Failed: No instruments fetched. Check logs for errors.")
    else:
        test_stocks = all_stocks
        print(f"[TEST] Success: Fetched {len(all_stocks)} instruments.")
        print("\n--- [OUTPUT 1] Sample Stock Data (first 5) ---")
        pprint.pprint(all_stocks[:5], indent=2)

        print("\n[TEST] Updating stocks table in DB...")
        update_stocks_table(test_stocks)
        print("[TEST] Database update completed successfully!")

    print("\n--- Test Complete ---")
