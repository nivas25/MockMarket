"""
Historical Data Backfill Script
Fetches and populates Stock_History table with historical candle data from Upstox
Run this ONCE to fill your database with chart data for all stocks
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import requests
from datetime import datetime, timedelta
from db_pool import get_connection
from dotenv import load_dotenv
from utils.pretty_log import console, status_ok, status_err, status_warn
from services.http_client import upstox_get
import time

load_dotenv()

UPSTOX_TOKEN = os.environ.get("UPSTOX_ACCESS_TOKEN")

def backfill_historical_data(days_back=365):
    """
    Backfill historical daily candles for all NSE stocks
    
    Args:
        days_back: Number of days to fetch (default 365 = 1 year)
    """
    if not UPSTOX_TOKEN:
        status_err("❌ UPSTOX_ACCESS_TOKEN not found in environment")
        return
    
    console.rule("📊 HISTORICAL DATA BACKFILL")
    console.log(f"Fetching last {days_back} days of data for NSE stocks...\n")
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get all NSE stocks with ISINs
        cursor.execute("""
            SELECT stock_id, symbol, isin, exchange, company_name 
            FROM Stocks 
            WHERE exchange = 'NSE' AND isin IS NOT NULL
            ORDER BY stock_id
        """)
        stocks = cursor.fetchall()
        
        if not stocks:
            status_warn("No NSE stocks found in database")
            return
        
        console.log(f"Found {len(stocks)} NSE stocks to process\n")
        
        to_date = datetime.now().date()
        from_date = to_date - timedelta(days=days_back)
        
        total_inserted = 0
        processed = 0
        skipped = 0
        
        for stock in stocks:
            stock_id = stock['stock_id']
            symbol = stock['symbol']
            isin = stock['isin']
            exchange = stock.get('exchange', 'NSE')
            
            try:
                # Check if data already exists
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM Stock_History 
                    WHERE stock_id = %s AND timeframe = 'day' AND timestamp >= %s
                """, (stock_id, from_date))
                result = cursor.fetchone()
                existing_count = result['count'] if result else 0
                
                if existing_count > (days_back * 0.7):  # If we have >70% of expected data, skip
                    console.log(f"[⏭️] {symbol}: Already has {existing_count} candles, skipping")
                    skipped += 1
                    continue
                
                # Fetch from Upstox
                instrument_key = f"{exchange}_EQ|{isin}"
                url = f"https://api.upstox.com/v2/historical-candle/{instrument_key}/day/{to_date:%Y-%m-%d}/{from_date:%Y-%m-%d}"
                
                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": f"Bearer {UPSTOX_TOKEN}",
                }
                
                resp = upstox_get(url, headers=headers)
                resp.raise_for_status()
                
                payload = resp.json() or {}
                
                if payload.get("status") != "success":
                    status_warn(f"[❌] {symbol}: API returned error")
                    continue
                
                candles = payload.get("data", {}).get("candles", []) or []
                
                if not candles:
                    console.log(f"[⚠️] {symbol}: No data from API")
                    continue
                
                # Insert candles
                insert_rows = []
                for row in candles:
                    # row = [timestamp, open, high, low, close, volume, oi]
                    ts_iso = row[0]
                    try:
                        ts_date = datetime.fromisoformat(ts_iso.replace("Z", "+00:00")).date()
                    except Exception:
                        ts_date = datetime.strptime(ts_iso[:10], "%Y-%m-%d").date()
                    
                    o = float(row[1] or 0)
                    h = float(row[2] or 0)
                    l = float(row[3] or 0)
                    c = float(row[4] or 0)
                    v = int(row[5] or 0)
                    
                    insert_rows.append((stock_id, 'day', ts_date, o, h, l, c, v))
                
                if insert_rows:
                    cursor.executemany("""
                        INSERT INTO Stock_History (stock_id, timeframe, timestamp, open_price, high_price, low_price, close_price, volume)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                          open_price=VALUES(open_price),
                          high_price=VALUES(high_price),
                          low_price=VALUES(low_price),
                          close_price=VALUES(close_price),
                          volume=VALUES(volume)
                    """, insert_rows)
                    conn.commit()
                    
                    total_inserted += len(insert_rows)
                    processed += 1
                    
                    status_ok(f"[✅] {symbol}: Inserted {len(insert_rows)} candles")
                
                # Rate limiting - be nice to Upstox API
                time.sleep(0.5)  # 2 requests per second max
                
            except requests.HTTPError as e:
                if e.response.status_code == 429:
                    status_warn(f"[⏸️] Rate limited, sleeping 60 seconds...")
                    time.sleep(60)
                else:
                    status_err(f"[❌] {symbol}: HTTP error {e.response.status_code}")
            except Exception as e:
                status_err(f"[❌] {symbol}: Error - {e}")
                continue
        
        console.rule("✅ BACKFILL COMPLETE")
        console.log(f"""
📊 Summary:
   • Processed: {processed} stocks
   • Skipped: {skipped} stocks (already had data)
   • Total candles inserted: {total_inserted:,}
   • Timeframe: {from_date} to {to_date}
   
💡 Your charts should now display properly!
🎯 Restart your frontend to see the changes.
        """)
        
    except Exception as e:
        status_err(f"Fatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    console.log("\n⚠️  This will fetch historical data for ALL NSE stocks")
    console.log("⏱️  This may take 15-30 minutes depending on API rate limits\n")
    
    choice = input("Continue? (yes/no): ").strip().lower()
    
    if choice == "yes":
        # Fetch 1 year of data
        backfill_historical_data(days_back=365)
    else:
        console.log("❌ Cancelled by user")
