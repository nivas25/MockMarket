import requests
import gzip
import io
import json
from datetime import datetime
from db_pool import get_connection
import os
import time

# Load your Upstox token from environment variables
UPSTOX_TOKEN = os.environ.get("UPSTOX_ACCESS_TOKEN")  # set this in .env

BATCH_SIZE = 100  # Reduced for safety (query length limits)

def get_all_nse_instruments():
    """Download and filter active NSE EQ instruments, return dict of ik: trading_symbol"""
    url = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz"
    print("[📦] Downloading NSE instruments...")

    resp = requests.get(url)
    resp.raise_for_status()

    with gzip.GzipFile(fileobj=io.BytesIO(resp.content)) as gz_file:
        instruments = json.loads(gz_file.read().decode("utf-8"))

    # Filter only NSE equity stocks
    nse_eq_instruments = [
        i for i in instruments
        if i.get("exchange") == "NSE" and i.get("instrument_type") == "EQ"
    ]
    print(f"[+] Found {len(nse_eq_instruments)} NSE_EQ instruments.")
    # Return dict: instrument_key -> trading_symbol
    return {
        inst["instrument_key"]: inst["trading_symbol"]
        for inst in nse_eq_instruments
    }


def fetch_all_stock_prices():
    """Fetch prices for valid NSE EQ stocks in batches and insert into DB"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Step 1: Get NSE EQ instrument key to symbol mapping
        ik_to_symbol = get_all_nse_instruments()

        # Step 2: Get NSE stocks from DB, filter to valid EQ only
        cursor.execute("SELECT stock_id, isin, company_name FROM Stocks WHERE exchange='NSE'")
        all_stocks = cursor.fetchall()

        # Filter to only valid EQ (build instrument_key and check dict)
        valid_stocks = [
            stock for stock in all_stocks
            if f"NSE_EQ|{stock['isin']}" in ik_to_symbol
        ]

        if not valid_stocks:
            print("[!] No valid NSE EQ stocks found in DB")
            return

        print(f"[+] Filtered to {len(valid_stocks)} valid NSE EQ stocks from DB")

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f"Bearer {UPSTOX_TOKEN}"
        }

        total_inserted = 0
        first_batch = True  # For sample logging
        # Step 3: Batch the valid stocks
        for i in range(0, len(valid_stocks), BATCH_SIZE):
            batch = valid_stocks[i:i + BATCH_SIZE]
            instrument_keys = [f"NSE_EQ|{stock['isin']}" for stock in batch]
            symbols = [ik_to_symbol[ik] for ik in instrument_keys]
            batch_iks_str = ",".join(instrument_keys)  # Let requests handle encoding
            stock_ids = [stock['stock_id'] for stock in batch]
            stock_names = [stock['company_name'] or "Unknown" for stock in batch]  # Use company_name for stock_name

            try:
                # Use /quotes endpoint for batch OHLC data
                url = "https://api.upstox.com/v2/market-quote/quotes"
                resp = requests.get(url, params={"instrument_key": batch_iks_str}, headers=headers)
                resp.raise_for_status()
                json_data = resp.json()

                if json_data.get("status") != "success":
                    print(f"[!] API error for batch {i//BATCH_SIZE + 1}: {json_data}")
                    continue

                data = json_data.get('data', {})
                print(f"[DEBUG] Batch {i//BATCH_SIZE + 1}: {len(instrument_keys)} requested, {len(data)} returned")  # Debug

                if not data:
                    print(f"[!] No data for batch {i//BATCH_SIZE + 1}")
                    continue

                # Log sample response for first batch (debug only)
                if first_batch:
                    sample_response_key = list(data.keys())[0]
                    sample_quote = data[sample_response_key]
                    print(f"[SAMPLE] Response structure for {sample_response_key}:")
                    print(json.dumps(sample_quote, indent=2, default=str))
                    first_batch = False

                insert_data = []
                skipped_count = 0
                unchanged_count = 0
                for idx, ik in enumerate(instrument_keys):
                    response_key = f"NSE_EQ:{symbols[idx]}"
                    if response_key not in data:
                        skipped_count += 1
                        continue

                    stock_quote = data[response_key]
                    ohlc = stock_quote.get('ohlc', {})

                    # Better fallback chain for closed/non-trading days
                    ltp = float(stock_quote.get('last_price', 0))
                    if ltp <= 0:
                        ltp = float(stock_quote.get('previous_close', 0))
                    if ltp <= 0:
                        ltp = float(ohlc.get('close', 0))

                    net_change = float(stock_quote.get('net_change', 0))
                    prev_close = float(stock_quote.get('previous_close', 0)) or (ltp - net_change)

                    # Skip if still no valid price
                    if ltp <= 0:
                        skipped_count += 1
                        continue

                    # Check for duplicate: Query last LTP for this stock_id
                    cursor.execute(
                        "SELECT ltp FROM Stock_Prices WHERE stock_id = %s ORDER BY as_of DESC LIMIT 1",
                        (stock_ids[idx],)
                    )
                    last_record = cursor.fetchone()
                    if last_record and float(last_record['ltp']) == ltp:
                        unchanged_count += 1
                        print(f"[⏭️] Skipped unchanged LTP for {stock_names[idx]} ({ltp})")
                        continue

                    price_data = {
                        'ltp': ltp,
                        'day_high': float(ohlc.get('high', ltp)),
                        'day_low': float(ohlc.get('low', ltp)),
                        'day_open': float(ohlc.get('open', ltp)),
                        'prev_close': prev_close,
                        'as_of': datetime.now()
                    }

                    insert_data.append((
                        stock_ids[idx],
                        stock_names[idx],  # Maps to stock_name column
                        price_data['ltp'],
                        price_data['day_high'],
                        price_data['day_low'],
                        price_data['day_open'],
                        price_data['prev_close'],
                        price_data['as_of']
                    ))

                batch_inserted = len(insert_data)
                if insert_data:
                    cursor.executemany("""
                        INSERT INTO Stock_Prices (stock_id, stock_name, ltp, day_high, day_low, day_open, prev_close, as_of)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, insert_data)
                    conn.commit()
                    success_rate = (batch_inserted / len(batch)) * 100
                    print(f"[+] Inserted {batch_inserted}/{len(batch)} prices ({success_rate:.1f}%) for batch {i//BATCH_SIZE + 1} "
                          f"({unchanged_count} unchanged, {skipped_count} skipped)")
                    total_inserted += batch_inserted
                else:
                    print(f"[!] No valid data in batch {i//BATCH_SIZE + 1} ({skipped_count} skipped, {unchanged_count} unchanged)")

                # Small delay between batches
                time.sleep(1)

            except requests.HTTPError as http_err:
                print(f"[!] HTTP error for batch {i//BATCH_SIZE + 1}: {http_err}")
            except Exception as e:
                print(f"[!] Batch error {i//BATCH_SIZE + 1}: {e}")
                import traceback
                traceback.print_exc()

        print(f"[✅] Full fetch complete: {total_inserted} total prices inserted from {len(valid_stocks)} valid stocks")

    except Exception as e:
        print(f"[!] DB Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    # Repeat every 2 minutes (120 seconds)
    while True:
        print(f"[{datetime.now()}] Starting price fetch...")
        fetch_all_stock_prices()
        print(f"[{datetime.now()}] Fetch complete. Sleeping 120s...\n")
        time.sleep(120)