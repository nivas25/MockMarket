"""
Temporary Script: Fill Stock Prices Database NOW
Run this once to populate the Stock_Prices table with current data
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
from utils.pretty_log import console, status_ok, status_err

def main():
    console.rule("🚀 FILLING STOCK PRICES DATABASE")
    console.log("This will fetch current prices for ~2,200 NSE stocks...")
    console.log("⏱️ This may take 2-3 minutes depending on API response time\n")
    
    try:
        # Fetch and insert all stock prices (save_to_db=True)
        fetch_all_stock_prices(save_to_db=True)
        
        status_ok("\n✅ DATABASE FILLED SUCCESSFULLY!")
        console.log("📊 Check your Stock_Prices table - it should now have ~2,200 rows")
        console.log("💡 You can now use the application normally\n")
        
    except Exception as e:
        status_err(f"\n❌ ERROR: {e}")
        console.log("Please check your database connection and Upstox API credentials\n")
        sys.exit(1)

if __name__ == "__main__":
    main()
