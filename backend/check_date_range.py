#!/usr/bin/env python3
"""Simulate the API date range calculation"""
from datetime import datetime, timedelta

# Simulate API request with limit=30
today = datetime.now().date()
limit = 30

# This is what the API does (line 495)
from_date = today - timedelta(days=max(limit, 1) * 2)
to_date = today

print("=" * 60)
print("API Date Range Calculation (limit=30):")
print("=" * 60)
print(f"Today: {today}")
print(f"From date: {from_date} (today - 60 days)")
print(f"To date: {to_date}")
print()

# Check if database has data in this range
from db_pool import get_connection
conn = get_connection()
cursor = conn.cursor(dictionary=True)

cursor.execute("""
    SELECT COUNT(*) as count 
    FROM Stock_History 
    WHERE stock_id = 2 
      AND timeframe = 'day' 
      AND timestamp BETWEEN %s AND %s
""", (from_date, to_date))

result = cursor.fetchone()
print(f"✅ Candles in this range: {result['count']}")

if result['count'] == 0:
    print("\n❌ NO DATA FOUND IN API'S DATE RANGE!")
    print("This is why the API returns empty data.")
    print("\nDatabase has data from 2024-10-30 to 2025-10-29")
    print(f"But API is querying from {from_date} to {to_date}")
    print("\n🔧 SOLUTION: Need to fetch RECENT data from Upstox")
else:
    print(f"\n✅ Found {result['count']} candles - API should work!")

cursor.close()
conn.close()
print("=" * 60)
