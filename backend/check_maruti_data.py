#!/usr/bin/env python3
"""Quick check of MARUTI data in Stock_History"""
from db_pool import get_connection

conn = get_connection()
cursor = conn.cursor(dictionary=True)

# Check MARUTI data
cursor.execute("""
    SELECT COUNT(*) as count, 
           MIN(timestamp) as first_date, 
           MAX(timestamp) as last_date 
    FROM Stock_History 
    WHERE stock_id = 2 AND timeframe = 'day'
""")
result = cursor.fetchone()

print("=" * 60)
print("MARUTI Stock_History Data:")
print("=" * 60)
if result and result['count'] > 0:
    print(f"✅ Total candles: {result['count']}")
    print(f"📅 Date range: {result['first_date']} to {result['last_date']}")
    
    # Check recent data (last 90 days)
    from datetime import datetime, timedelta
    recent_date = datetime.now().date() - timedelta(days=90)
    cursor.execute("""
        SELECT COUNT(*) as count 
        FROM Stock_History 
        WHERE stock_id = 2 AND timeframe = 'day' AND timestamp >= %s
    """, (recent_date,))
    recent = cursor.fetchone()
    print(f"📊 Recent candles (last 90 days): {recent['count']}")
    
    # Show sample of recent data
    cursor.execute("""
        SELECT timestamp, open_price, close_price, volume 
        FROM Stock_History 
        WHERE stock_id = 2 AND timeframe = 'day' 
        ORDER BY timestamp DESC 
        LIMIT 5
    """)
    samples = cursor.fetchall()
    print("\n📈 Most recent 5 candles:")
    for s in samples:
        print(f"  {s['timestamp']}: Open={s['open_price']}, Close={s['close_price']}, Vol={s['volume']}")
else:
    print("❌ No data found for MARUTI")

cursor.close()
conn.close()
print("=" * 60)
