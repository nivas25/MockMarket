# controller/trade_controller.py

import os
import requests
import time
import logging
from typing import Optional, Dict, Tuple, Dict as TypeDict
from db_pool import get_connection
from datetime import datetime
from threading import Lock  # For thread-safe caching

# ✅ Import pending order function
from controller.order.order_status import create_pending_order

logger = logging.getLogger(__name__)
UPSTOX_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN")
UPSTOX_URL = "https://api.upstox.com/v2/market-quote/quotes"
HOLIDAYS_API = "https://api.upstox.com/v2/market/holidays"

# In-memory cache for live prices: {isin: (price, timestamp)}
_price_cache: Dict[str, Tuple[float, float]] = {}
_cache_lock = Lock()
_CACHE_TTL = 30  # seconds

# Global cache for holidays (fetched once)
_holidays_cache: Optional[TypeDict[str, set]] = None
_holidays_lock = Lock()

def fetch_upstox_holidays() -> Dict[str, set]:
    """Fetch trading holidays from official Upstox API."""
    global _holidays_cache
    with _holidays_lock:
        if _holidays_cache is not None:
            return _holidays_cache
    
    holidays_by_year = {}
    headers = {
        "Authorization": f"Bearer {UPSTOX_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(HOLIDAYS_API, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") == "success":
            for entry in data.get("data", []):
                date_str = entry.get("date")  # e.g., "2025-02-01"
                holiday_type = entry.get("holiday_type")
                closed_exchanges = entry.get("closed_exchanges", [])
                
                # Filter for full trading holidays where NSE is closed
                if holiday_type == "TRADING_HOLIDAY" and "NSE" in closed_exchanges:
                    year = date_str[:4]
                    if year not in holidays_by_year:
                        holidays_by_year[year] = set()
                    holidays_by_year[year].add(date_str)
        
        # Fallback: If API fails, use hardcoded for 2025
        if not holidays_by_year:
            logger.warning("Upstox API returned no data, using fallback holidays.")
            fallback_year = datetime.now().strftime("%Y")
            holidays_by_year[fallback_year] = {
                '2025-01-26', '2025-03-14', '2025-03-31', '2025-04-10', '2025-04-18',
                '2025-05-12', '2025-05-27', '2025-07-21', '2025-08-15', '2025-09-05',
                '2025-10-02', '2025-10-20', '2025-10-21', '2025-11-05', '2025-12-25'
            }
        
        _holidays_cache = holidays_by_year
        return holidays_by_year
    
    except Exception as e:
        logger.error(f"Error fetching Upstox holidays: {e}")
        # Fallback to hardcoded
        fallback_year = datetime.now().strftime("%Y")
        holidays_by_year = {fallback_year: {
            '2025-01-26', '2025-03-14', '2025-03-31', '2025-04-10', '2025-04-18',
            '2025-05-12', '2025-05-27', '2025-07-21', '2025-08-15', '2025-09-05',
            '2025-10-02', '2025-10-20', '2025-10-21', '2025-11-05', '2025-12-25'
        }}
        _holidays_cache = holidays_by_year
        return holidays_by_year

# ✅ Market open checker (weekday, time, and holidays from Upstox API)
def is_market_open():
    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')
    year = now.strftime('%Y')
    
    # Fetch holidays from Upstox API (cached)
    holidays_by_year = fetch_upstox_holidays()
    holidays = holidays_by_year.get(year, set())
    
    # Holiday check
    if date_str in holidays:
        return False, f"Market closed (Upstox Holiday: {date_str})."

    # Weekend check
    if now.weekday() >= 5:
        return False, "Market closed (Weekend)."

    # Time check (9:15 to 3:30)
    market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)

    if not (market_open <= now <= market_close):
        return False, "Market closed (Outside trading hours)."

    return True, "Market is open."


def _get_cached_price(isin: str) -> Optional[float]:
    with _cache_lock:
        if isin in _price_cache:
            price, timestamp = _price_cache[isin]
            if time.time() - timestamp < _CACHE_TTL:
                return price
            else:
                del _price_cache[isin]
        return None


def _set_cached_price(isin: str, price: float):
    with _cache_lock:
        _price_cache[isin] = (price, time.time())


def get_stock_info(stock_name: str) -> Optional[Dict[str, any]]:
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


def get_user_stock_quantity(connection, user_id: int, stock_id: int) -> int:
    cursor = connection.cursor()
    cursor.execute("""
        SELECT SUM(CASE WHEN transaction_type='Buy' THEN quantity ELSE -quantity END) AS qty
        FROM Transactions
        WHERE user_id = %s AND stock_id = %s
    """, (user_id, stock_id))
    result = cursor.fetchone()
    cursor.close()
    return int(result[0]) if result and result[0] is not None else 0


def get_user_balance(connection, user_id: int) -> float:
    cursor = connection.cursor()
    cursor.execute("SELECT balance FROM Users WHERE user_id = %s", (user_id,))
    result = cursor.fetchone()
    cursor.close()
    return float(result[0]) if result and result[0] is not None else 0.0


def get_live_price(isin: str, stock_id: int = None) -> Optional[float]:
    start_time = time.time()

    if stock_id:
        try:
            from services.live_price_cache import get_cached_price_by_stock_id, get_cache_age_seconds
            ws_price = get_cached_price_by_stock_id(stock_id)
            if ws_price is not None:
                age = get_cache_age_seconds(stock_id)
                if age is not None and age < 15:
                    elapsed = time.time() - start_time
                    print(f"[🔴 WEBSOCKET] Price from live cache: ₹{ws_price} (age: {age:.1f}s)")
                    print(f"[⏱️] get_live_price took {elapsed:.2f}s")
                    return ws_price
                else:
                    print(f"[⚠️] WebSocket price too old ({age:.1f}s), falling back to API")
        except Exception as e:
            print(f"[⚠️] WebSocket cache lookup failed: {e}")

    cached_price = _get_cached_price(isin)
    if cached_price is not None:
        elapsed = time.time() - start_time
        print(f"[📦] API cache hit for ISIN: {isin}, price: ₹{cached_price}")
        print(f"[⏱️] get_live_price took {elapsed:.2f}s")
        return cached_price

    headers = {"Authorization": f"Bearer {UPSTOX_TOKEN}"}
    params = {"instrument_key": f"NSE_EQ|{isin}"}

    try:
        print(f"[🌐] Fetching live price from Upstox API for ISIN: {isin}")
        response = requests.get(UPSTOX_URL, headers=headers, params=params, timeout=5)
        elapsed_api = time.time() - start_time
        print(f"[📡] Upstox API status code: {response.status_code} (took {elapsed_api:.2f}s)")

        data = response.json()

        if "data" in data and data["data"]:
            first_key = list(data["data"].keys())[0]
            price = data["data"][first_key]["last_price"]
            print(f"[💰] Extracted live price: ₹{price}")
            _set_cached_price(isin, float(price))
            elapsed = time.time() - start_time
            print(f"[⏱️] get_live_price took {elapsed:.2f}s")
            return float(price)
        else:
            print("[❌] No valid data in Upstox response.")
            return None

    except Exception as e:
        print(f"[❌] Error fetching price for {isin}: {e}")
        return None


def execute_trade(stock_name: str, intended_price: float, user_id: int, quantity: int, trade_type: str, confirm_code: Optional[str] = None) -> Dict[str, any]:
    start_total = time.time()
    print("\n===================== TRADE EXECUTION START =====================")
    print(f"[📥] Input Data: stock_name={stock_name}, intended_price={intended_price}, "
          f"user_id={user_id}, quantity={quantity}, trade_type={trade_type}, confirm_code={confirm_code}")

    logger.info(f"Trade execution started: user_id={user_id}, stock_name={stock_name}, trade_type={trade_type}, quantity={quantity}, intended_price={intended_price}")

    stock = get_stock_info(stock_name)
    if not stock:
        error_msg = f"Stock '{stock_name}' not found."
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}

    stock_id, isin = stock["stock_id"], stock["isin"]
    print(f"[🧾] Stock ID: {stock_id}, ISIN: {isin}")
    logger.info(f"Stock resolved: stock_id={stock_id}, isin={isin}")

    connection = get_connection()
    try:
        is_open, msg = is_market_open()
        live_price = None
        price_for_validation = intended_price

        if is_open:
            live_price = get_live_price(isin, stock_id=stock_id)
            if live_price is None:
                error_msg = "Unable to fetch live price."
                logger.error(error_msg)
                return {"status": "error", "message": error_msg}
            price_for_validation = live_price
            logger.info(f"Live price fetched: {live_price}")

        # Holdings/Balance check
        if trade_type == "Sell":
            user_qty = get_user_stock_quantity(connection, user_id, stock_id)
            logger.info(f"User holdings check for Sell: user_id={user_id}, stock_id={stock_id}, available_qty={user_qty}, requested_qty={quantity}")
            if user_qty < quantity:
                error_msg = f"Insufficient holdings. Available: {user_qty} shares."
                logger.warning(error_msg)
                return {"status": "error", "message": error_msg}
        elif trade_type == "Buy":
            user_balance = get_user_balance(connection, user_id)
            cost = quantity * price_for_validation
            logger.info(f"User balance check for Buy: user_id={user_id}, available_balance={user_balance}, required_cost={cost}")
            if user_balance < cost:
                error_msg = f"Insufficient balance. Required: ₹{cost:.2f}, Available: ₹{user_balance:.2f}"
                logger.warning(error_msg)
                return {"status": "error", "message": error_msg}

        if not is_open:
            print(f"[🛑] {msg}. Storing pending order.")
            logger.info(f"Market closed, creating pending order: user_id={user_id}, stock_id={stock_id}, trade_type={trade_type}, quantity={quantity}")
            result = create_pending_order(connection, stock_id, user_id, trade_type, quantity)
            connection.commit()
            logger.info(f"Pending order created successfully: {result}")
            return result

        # Market open
        print(f"[💰] Intended Price: ₹{intended_price}, Live Price: ₹{live_price}")
        logger.info(f"Price validation: intended={intended_price}, live={live_price}")
        price_diff = abs(live_price - intended_price)

        if confirm_code != "proceedok" and price_diff > 0.5:
            price_change_msg = f"Price changed from ₹{intended_price} → ₹{live_price}. Confirm to proceed."
            logger.warning(price_change_msg)
            return {
                "status": "price_changed",
                "message": price_change_msg,
                "current_price": live_price
            }

        cursor = connection.cursor()
        insert_query = """
            INSERT INTO Transactions (user_id, stock_id, transaction_type, quantity, price_at_trade)
            VALUES (%s, %s, %s, %s, %s)
        """
        logger.info(f"Inserting transaction: user_id={user_id}, stock_id={stock_id}, transaction_type={trade_type}, quantity={quantity}, price_at_trade={live_price}")
        cursor.execute(insert_query, (user_id, stock_id, trade_type, quantity, live_price))
        connection.commit()
        cursor.close()

        success_msg = f"{trade_type} executed successfully at ₹{live_price}"
        logger.info(f"Transaction executed successfully: {success_msg}")
        print(f"[✅] {success_msg}")
        return {
            "status": "success",
            "message": success_msg,
            "executed_price": live_price
        }

    except Exception as e:
        if connection:
            connection.rollback()
        logger.error(f"Trade execution error: {e}")
        print(f"[❌] Trade execution error: {e}")
        return {"status": "error", "message": f"Trade execution failed: {str(e)}"}

    finally:
        if connection:
            connection.close()
            print("[🔒] Database connection closed.")