import os
import requests
import time
import logging
from typing import Optional, Dict, Tuple, Dict as TypeDict
from db_pool import get_connection
from datetime import datetime
from threading import Lock  # For thread-safe caching

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
        if not UPSTOX_TOKEN:
            raise ValueError("Upstox token missing")
        response = requests.get(HOLIDAYS_API, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") == "success":
            for entry in data.get("data", []):
                date_str = entry.get("date")
                holiday_type = entry.get("holiday_type")
                closed_exchanges = entry.get("closed_exchanges", [])
                
                if holiday_type == "TRADING_HOLIDAY" and "NSE" in closed_exchanges:
                    year = date_str[:4]
                    if year not in holidays_by_year:
                        holidays_by_year[year] = set()
                    holidays_by_year[year].add(date_str)
        
        if not holidays_by_year:
            fallback_year = datetime.now().strftime("%Y")
            holidays_by_year[fallback_year] = {
                '2025-01-26', '2025-03-14', '2025-03-31', '2025-04-10', '2025-04-18',
                '2025-05-12', '2025-05-27', '2025-07-21', '2025-08-15', '2025-09-05',
                '2025-10-02', '2025-10-20', '2025-10-21', '2025-11-05', '2025-12-25'
            }
        
        _holidays_cache = holidays_by_year
        return holidays_by_year
    
    except Exception as e:
        logger.error(f"Holiday fetch error: {e}")
        fallback_year = datetime.now().strftime("%Y")
        holidays_by_year = {fallback_year: {
            '2025-01-26', '2025-03-14', '2025-03-31', '2025-04-10', '2025-04-18',
            '2025-05-12', '2025-05-27', '2025-07-21', '2025-08-15', '2025-09-05',
            '2025-10-02', '2025-10-20', '2025-10-21', '2025-11-05', '2025-12-25'
        }}
        _holidays_cache = holidays_by_year
        return holidays_by_year


def is_market_open():
    now = datetime.now()
    date_str = now.strftime('%Y-%m-%d')
    year = now.strftime('%Y')

    holidays = fetch_upstox_holidays().get(year, set())

    if date_str in holidays:
        return False, "Market is closed today due to holiday."

    if now.weekday() >= 5:
        return False, "Market is closed on weekends."

    market_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = now.replace(hour=15, minute=30, second=0, microsecond=0)

    if not (market_open <= now <= market_close):
        return False, "Market is closed at this time."

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
    if not conn:
        print("[❌] DB connection failed")
        return None

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT stock_id, isin FROM Stocks WHERE company_name = %s", (stock_name,))
        stock = cursor.fetchone()
        cursor.close()
        conn.close()
        print(f"[🟢] Stock info: {stock}")
        print(f"[⏱️] Took {time.time() - start_time:.2f}s")
        return stock
    except Exception as e:
        print(f"[❌] Stock query error: {e}")
        cursor.close()
        conn.close()
        return None


def get_user_stock_quantity(connection, user_id: int, stock_id: int) -> int:
    cursor = connection.cursor()
    try:
        cursor.execute("""
            SELECT SUM(CASE WHEN transaction_type='Buy' THEN quantity ELSE -quantity END) AS qty
            FROM Transactions WHERE user_id = %s AND stock_id = %s
        """, (user_id, stock_id))
        result = cursor.fetchone()
        cursor.close()
        return int(result[0]) if result and result[0] is not None else 0
    except:
        cursor.close()
        return 0


def get_user_balance(connection, user_id: int) -> float:
    cursor = connection.cursor()
    try:
        cursor.execute("SELECT balance FROM Users WHERE user_id = %s", (user_id,))
        result = cursor.fetchone()
        cursor.close()
        return float(result[0]) if result and result[0] is not None else 0.0
    except:
        cursor.close()
        return 0.0


def get_live_price(isin: str, stock_id: int = None) -> Optional[float]:
    start_time = time.time()

    try:
        from services.live_price_cache import get_cached_price_by_stock_id, get_cache_age_seconds
        ws_price = get_cached_price_by_stock_id(stock_id)
        if ws_price is not None and (get_cache_age_seconds(stock_id) < 15):
            print(f"[WS] Price: ₹{ws_price}")
            return ws_price
    except:
        pass

    cached_price = _get_cached_price(isin)
    if cached_price:
        print(f"[CACHE] Price: ₹{cached_price}")
        return cached_price

    headers = {"Authorization": f"Bearer {UPSTOX_TOKEN}"}
    params = {"instrument_key": f"NSE_EQ|{isin}"}

    try:
        response = requests.get(UPSTOX_URL, headers=headers, params=params, timeout=5)
        data = response.json()

        if "data" in data and data["data"]:
            price = data["data"][list(data["data"].keys())[0]]["last_price"]
            _set_cached_price(isin, float(price))
            print(f"[API] Price: ₹{price}")
            return float(price)

        return None

    except Exception as e:
        print(f"[❌] Live price fetch failed: {e}")
        return None


def re_submit(stock_name: str, intended_price: float, user_id: int, quantity: int, trade_type: str, confirm_code: Optional[str] = None, order_id: int = None) -> Dict[str, any]:
    print("\n=== TRADE EXECUTION ===")
    logger.info(f"Start trade user={user_id}, stock={stock_name}, type={trade_type}, qty={quantity}")

    stock = get_stock_info(stock_name)
    if not stock:
        return {"status": "error", "message": "Stock not found. Please check stock name."}

    if "stock_id" not in stock or "isin" not in stock:
        return {"status": "error", "message": "Stock data invalid. Try again later."}

    stock_id, isin = stock["stock_id"], stock["isin"]
    connection = get_connection()
    if not connection:
        return {"status": "error", "message": "Unable to connect to database. Try again later."}

    try:
        is_open, msg = is_market_open()
        if not is_open:
            logger.warning(msg)
            return {"status": "error", "message": "Market is closed, so the order cannot be fulfilled."}

        live_price = get_live_price(isin, stock_id=stock_id)
        if live_price is None:
            return {"status": "error", "message": "Unable to fetch live price. Try again later."}

        if trade_type == "Sell":
            user_qty = get_user_stock_quantity(connection, user_id, stock_id)
            if user_qty < quantity:
                return {"status": "error", "message": f"Not enough shares. You have {user_qty}."}

        elif trade_type == "Buy":
            user_balance = get_user_balance(connection, user_id)
            cost = quantity * live_price
            if user_balance < cost:
                return {"status": "error", "message": "Insufficient balance to complete this order."}

        price_diff = abs(live_price - intended_price)
        if confirm_code != "proceedok" and price_diff > 0.5:
            return {
                "status": "price_changed",
                "message": f"Price changed to ₹{live_price}. Please confirm to continue.",
                "current_price": live_price
            }

        cursor = connection.cursor()
        cursor.execute("""
            INSERT INTO Transactions (user_id, stock_id, transaction_type, quantity, price_at_trade)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, stock_id, trade_type, quantity, live_price))
        connection.commit()

        # Remove from Order table if order_id provided
        if order_id:
            try:
                del_cursor = connection.cursor(dictionary=True)
                logger.info(f"[🧾] Trying to delete from `Order` table where order_id = {order_id}")

                # Check if order exists before deleting
                del_cursor.execute("SELECT order_id FROM `Order` WHERE order_id = %s", (order_id,))
                result_before = del_cursor.fetchone()
                logger.info(f"[🔍] Order found before delete: {result_before}")

                del_cursor.execute("DELETE FROM `Order` WHERE order_id = %s", (order_id,))
                connection.commit()

                logger.info(f"[⚙️] Delete executed. Rows affected: {del_cursor.rowcount}")

                # Verify deletion
                del_cursor.execute("SELECT order_id FROM `Order` WHERE order_id = %s", (order_id,))
                result_after = del_cursor.fetchone()
                logger.info(f"[🔎] Order exists after delete? {result_after}")

                del_cursor.close()

                if result_before and not result_after:
                    logger.info(f"[✅] Order {order_id} deleted successfully from `Order` table.")
                elif not result_before:
                    logger.warning(f"[⚠️] Order {order_id} not found in `Order` table before deletion.")
                else:
                    logger.error(f"[❌] Order {order_id} still exists after deletion attempt!")

            except Exception as delete_e:
                logger.error(f"[🔥] Delete block failed for order_id={order_id}: {delete_e}", exc_info=True)


        return {
            "status": "success",
            "message": f"{trade_type} executed at ₹{live_price}",
            "executed_price": live_price
        }

    except Exception as e:
        connection.rollback()
        logger.error(f"Trade error: {e}", exc_info=True)
        return {"status": "error", "message": "Something went wrong while placing order."}

    finally:
        connection.close()
        print("[DB] Closed connection")    