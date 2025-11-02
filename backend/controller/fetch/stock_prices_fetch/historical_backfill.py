# Historical Data Backfill Service
from datetime import datetime, timedelta
from controller.fetch.stock_prices_fetch.fetch_stocks_prices import get_all_nse_instruments
from utils.pretty_log import status_ok, status_warn, status_err
import requests

def fetch_historical_ohlc(instrument_key, from_date, to_date, interval="day"):
    """
    Fetch historical OHLC data from Upstox.
    
    Args:
        instrument_key: NSE_EQ|INE123A01012
        from_date: datetime object (start date)
        to_date: datetime object (end date)
        interval: "1minute", "30minute", "day", "week", "month"
    
    Returns:
        List of {date, open, high, low, close, volume}
    """
    import os
    token = os.getenv("UPSTOX_TOKEN")
    if not token:
        raise ValueError("UPSTOX_TOKEN not found")
    
    url = "https://api.upstox.com/v2/historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}"
    url = url.format(
        instrument_key=instrument_key,
        interval=interval,
        to_date=to_date.strftime("%Y-%m-%d"),
        from_date=from_date.strftime("%Y-%m-%d")
    )
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    data = resp.json()
    
    if data.get("status") != "success":
        raise ValueError(f"API error: {data}")
    
    candles = data.get("data", {}).get("candles", [])
    
    # Parse candles: [timestamp, open, high, low, close, volume, oi]
    result = []
    for candle in candles:
        result.append({
            "date": datetime.fromisoformat(candle[0].replace("Z", "+00:00")),
            "open": float(candle[1]),
            "high": float(candle[2]),
            "low": float(candle[3]),
            "close": float(candle[4]),
            "volume": int(candle[5])
        })
    
    return result


def backfill_missing_dates(stock_id, symbol, instrument_key, cursor, conn):
    """
    Find gaps in Stock_Prices and backfill with historical data.
    
    Logic:
    1. Find the earliest and latest dates in Stock_Prices for this stock
    2. Identify missing dates (market days only)
    3. Fetch historical data for missing date ranges
    4. Insert into Stock_Prices
    """
    # Get date range from Stock_Prices
    cursor.execute("""
        SELECT MIN(DATE(as_of)) as earliest, MAX(DATE(as_of)) as latest
        FROM Stock_Prices
        WHERE stock_id = %s
    """, (stock_id,))
    
    row = cursor.fetchone()
    if not row or not row['earliest']:
        # No data yet - backfill last 30 days
        to_date = datetime.now()
        from_date = to_date - timedelta(days=30)
    else:
        # Check for gaps between earliest and latest
        earliest = row['earliest']
        latest = row['latest']
        
        # Find missing dates
        cursor.execute("""
            SELECT DATE(as_of) as price_date
            FROM Stock_Prices
            WHERE stock_id = %s AND as_of BETWEEN %s AND %s
            GROUP BY DATE(as_of)
            ORDER BY price_date
        """, (stock_id, earliest, latest))
        
        existing_dates = {row['price_date'] for row in cursor.fetchall()}
        
        # Generate all dates in range (excluding weekends)
        all_dates = []
        current = earliest
        while current <= latest:
            if current.weekday() < 5:  # Mon-Fri
                all_dates.append(current)
            current += timedelta(days=1)
        
        missing_dates = [d for d in all_dates if d not in existing_dates]
        
        if not missing_dates:
            status_ok(f"No missing dates for {symbol}")
            return 0
        
        status_warn(f"Found {len(missing_dates)} missing dates for {symbol}")
        from_date = min(missing_dates)
        to_date = max(missing_dates)
    
    # Fetch historical data
    try:
        candles = fetch_historical_ohlc(instrument_key, from_date, to_date, interval="day")
        
        if not candles:
            return 0
        
        # Insert into Stock_Prices
        insert_data = [
            (stock_id, candle['close'], candle['high'], candle['low'], 
             candle['open'], candle['close'], candle['date'])
            for candle in candles
        ]
        
        cursor.executemany("""
            INSERT INTO Stock_Prices (stock_id, ltp, day_high, day_low, day_open, prev_close, as_of)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                ltp = VALUES(ltp),
                day_high = VALUES(day_high),
                day_low = VALUES(day_low),
                day_open = VALUES(day_open),
                prev_close = VALUES(prev_close),
                as_of = VALUES(as_of)
        """, insert_data)
        
        conn.commit()
        status_ok(f"Backfilled {len(insert_data)} historical records for {symbol}")
        return len(insert_data)
        
    except Exception as e:
        status_err(f"Backfill error for {symbol}: {e}")
        return 0


# Usage: Create a separate backfill script
# python backend/backfill_missing_dates.py
