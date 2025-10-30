# controller/trade_controller.py

import os
import requests
import time
from typing import Optional, Dict, Tuple
from db_pool import get_connection
from datetime import datetime
from threading import Lock  # For thread-safe caching

UPSTOX_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN")
UPSTOX_URL = "https://api.upstox.com/v2/market-quote/quotes"

# In-memory cache for live prices: {isin: (price, timestamp)}
_price_cache: Dict[str, Tuple[float, float]] = {}
_cache_lock = Lock()
_CACHE_TTL = 30  # seconds

def _get_cached_price(isin: str) -> Optional[float]:
    """Retrieve price from cache if not expired."""
    with _cache_lock:
        if isin in _price_cache:
            price, timestamp = _price_cache[isin]
            if time.time() - timestamp < _CACHE_TTL:
                return price
            else:
                del _price_cache[isin]  # Expire
        return None

def _set_cached_price(isin: str, price: float):
    """Set price in cache with current timestamp."""
    with _cache_lock:
        _price_cache[isin] = (price, time.time())

def get_stock_info(stock_name: str) -> Optional[Dict[str, any]]:
    """Fetch stock_id and ISIN from Stocks table."""
    start_time = time.time()
    print(f"[ℹ️] Fetching stock info for: {stock_name}")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("SELECT stock_id, isin FROM Stocks WHERE company_name = %s", (stock_name,))
    stock = cursor.fetchone()

    print(f"[🟢] Stock info fetched: {stock}")
    cursor.close()
    conn.close()
    elapsed = time.time() - start_time
    print(f"[⏱️] get_stock_info took {elapsed:.2f}s")
    return stock

def get_live_price(isin: str) -> Optional[float]:
    """Fetch real-time stock price from Upstox API, with caching."""
    start_time = time.time()
    cached_price = _get_cached_price(isin)
    if cached_price is not None:
        elapsed = time.time() - start_time
        print(f"[📦] Cache hit for ISIN: {isin}, price: ₹{cached_price}")
        print(f"[⏱️] get_live_price took {elapsed:.2f}s")
        return cached_price

    headers = {"Authorization": f"Bearer {UPSTOX_TOKEN}"}
    params = {"instrument_key": f"NSE_EQ|{isin}"}

    try:
        print(f"[🌐] Fetching live price for ISIN: {isin}")
        response = requests.get(UPSTOX_URL, headers=headers, params=params, timeout=5)  # Reduced timeout
        elapsed_api = time.time() - start_time
        print(f"[📡] Upstox API status code: {response.status_code} (took {elapsed_api:.2f}s)")

        data = response.json()
        print(f"[📊] Upstox API response: {data}")

        if "data" in data and data["data"]:
            first_key = list(data["data"].keys())[0]
            price = data["data"][first_key]["last_price"]
            print(f"[💰] Extracted live price: ₹{price}")
            _set_cached_price(isin, float(price))  # Cache the result
            elapsed = time.time() - start_time
            print(f"[⏱️] get_live_price took {elapsed:.2f}s")
            return float(price)
        else:
            print("[❌] No valid data found in Upstox response.")
            elapsed = time.time() - start_time
            print(f"[⏱️] get_live_price took {elapsed:.2f}s")
            return None

    except Exception as e:
        elapsed = time.time() - start_time
        print(f"[❌] Error fetching price for {isin}: {e}")
        print(f"[⏱️] get_live_price took {elapsed:.2f}s")
        return None

def execute_trade(stock_name: str, intended_price: float, user_id: int, quantity: int, trade_type: str, confirm_code: Optional[str] = None) -> Dict[str, any]:
    """
    Handle both Buy and Sell trades:
    1️⃣ Fetch stock info (stock_id, ISIN)
    2️⃣ Get live price from Upstox
    3️⃣ If price differs & not confirmed → return price_changed
    4️⃣ If confirmed → Insert into Transactions table (trigger auto-updates wallet, portfolio)
    """
    start_total = time.time()
    print("\n===================== TRADE EXECUTION START =====================")
    print(f"[📥] Input Data: stock_name={stock_name}, intended_price={intended_price}, "
          f"user_id={user_id}, quantity={quantity}, trade_type={trade_type}, confirm_code={confirm_code}")

    # Step 1: Get stock info
    stock = get_stock_info(stock_name)
    if not stock:
        elapsed_total = time.time() - start_total
        print(f"[❌] Stock not found in DB: {stock_name}")
        print(f"[⏱️] execute_trade total took {elapsed_total:.2f}s")
        return {"status": "error", "message": f"Stock '{stock_name}' not found."}

    stock_id, isin = stock["stock_id"], stock["isin"]
    print(f"[🧾] Stock ID: {stock_id}, ISIN: {isin}")

    # Step 2: Get live price
    live_price = get_live_price(isin)
    if live_price is None:
        elapsed_total = time.time() - start_total
        print("[❌] Could not fetch live price from Upstox.")
        print(f"[⏱️] execute_trade total took {elapsed_total:.2f}s")
        return {"status": "error", "message": "Unable to fetch live price."}

    print(f"[💰] Intended Price: ₹{intended_price}, Live Price: ₹{live_price}")

    # Step 3: Compare prices
    price_diff = abs(live_price - intended_price)
    print(f"[⚖️] Price Difference: ₹{price_diff}")

    if confirm_code != "proceedok" and price_diff > 0.5:
        elapsed_total = time.time() - start_total
        print(f"[⚠️] Price difference exceeds ₹0.5, confirmation required.")
        print(f"[⏱️] execute_trade total took {elapsed_total:.2f}s")
        return {
            "status": "price_changed",
            "message": f"Price changed from ₹{intended_price} → ₹{live_price}. Confirm to proceed.",
            "current_price": live_price
        }

    # Step 4: Execute trade (insert transaction)
    connection = None
    try:
        connection = get_connection()
        with connection.cursor() as cursor:
            insert_query = """
                INSERT INTO Transactions (user_id, stock_id, transaction_type, quantity, price_at_trade)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_query, (user_id, stock_id, trade_type, quantity, live_price))
            connection.commit()

        elapsed_total = time.time() - start_total
        print("[✅] Transaction inserted successfully — trigger executed automatically.")
        print(f"[⏱️] execute_trade total took {elapsed_total:.2f}s")
        return {
            "status": "success",
            "message": f"{trade_type} executed successfully at ₹{live_price}",
            "executed_price": live_price
        }

    except Exception as db_error:
        elapsed_total = time.time() - start_total
        print(f"[❌] Database error during trade execution: {db_error}")
        print(f"[⏱️] execute_trade total took {elapsed_total:.2f}s")
        return {"status": "error", "message": f"Database error: {db_error}"}

    finally:
        if connection and hasattr(connection, 'is_connected') and connection.is_connected():
            connection.close()
            print("[🔒] Database connection closed.")

    print("====================== TRADE EXECUTION END ======================\n")