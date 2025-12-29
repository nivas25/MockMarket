# controller/order/buy_sell_order.py
"""
Production-ready trading controller for buy/sell order execution.
Handles live trading, pending orders, and market validation.
"""

import os
import requests
import time
import logging
from typing import Optional, Dict, Tuple, Any
from decimal import Decimal, InvalidOperation
from db_pool import get_db_connection
from datetime import datetime
from threading import Lock

# Import pending order function
from controller.order.order_status import create_pending_order

logger = logging.getLogger(__name__)

# Configuration from environment
UPSTOX_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN")
UPSTOX_URL = "https://api.upstox.com/v2/market-quote/quotes"
HOLIDAYS_API = "https://api.upstox.com/v2/market/holidays"

# Trading limits from environment (with sensible defaults)
# Trading limits from environment (with sensible defaults)
MAX_ORDER_QUANTITY = int(os.getenv("MAX_ORDER_QUANTITY", "10000"))
MIN_ORDER_QUANTITY = int(os.getenv("MIN_ORDER_QUANTITY", "1"))
MAX_ORDER_VALUE = float(os.getenv("MAX_ORDER_VALUE", "1000000"))  # ₹10 lakhs

# In-memory cache for live prices: {isin: (price, timestamp)}
_price_cache: Dict[str, Tuple[float, float]] = {}
_cache_lock = Lock()
_CACHE_TTL = 30  # seconds

from utils.market_hours import is_market_open as check_market_open, get_market_status

# ✅ Market open checker (uses centralized utility)
def is_market_open():
    status = get_market_status()
    if status["is_market_open"]:
        return True, "Market is open."
    return False, status.get("message", "Market is closed.")


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


def get_stock_info(stock_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetch stock information from database by company name.
    
    Args:
        stock_name: Company name to look up
        
    Returns:
        Dictionary with stock_id and isin, or None if not found
    """
    start_time = time.time()
    logger.debug(f"Fetching stock info for: {stock_name}")
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            cursor.execute(
                "SELECT stock_id, isin FROM Stocks WHERE company_name = %s", 
                (stock_name,)
            )
            stock = cursor.fetchone()
            cursor.close()
            
            elapsed = time.time() - start_time
            if stock:
                logger.debug(f"Stock info fetched: {stock} (took {elapsed:.3f}s)")
            else:
                logger.warning(f"Stock '{stock_name}' not found in database")
            
            return stock
    except Exception as e:
        logger.error(f"Error fetching stock info for '{stock_name}': {e}")
        return None


def get_user_stock_quantity(connection, user_id: int, stock_id: int) -> int:
    """
    Calculate user's current holdings for a stock.
    
    Args:
        connection: Active database connection
        user_id: User ID to check
        stock_id: Stock ID to check
        
    Returns:
        Net quantity owned (Buy - Sell)
    """
    try:
        cursor = connection.cursor()
        cursor.execute("""
            SELECT SUM(CASE WHEN transaction_type='Buy' THEN quantity ELSE -quantity END) AS qty
            FROM Transactions
            WHERE user_id = %s AND stock_id = %s
        """, (user_id, stock_id))
        result = cursor.fetchone()
        cursor.close()
        
        quantity = int(result[0]) if result and result[0] is not None else 0
        logger.debug(f"User {user_id} holds {quantity} shares of stock {stock_id}")
        return quantity
    except Exception as e:
        logger.error(f"Error fetching user stock quantity: {e}")
        return 0


def get_user_balance(connection, user_id: int) -> float:
    """
    Fetch user's current account balance.
    
    Args:
        connection: Active database connection
        user_id: User ID to check
        
    Returns:
        Current balance in INR
    """
    try:
        cursor = connection.cursor()
        cursor.execute("SELECT balance FROM Users WHERE user_id = %s", (user_id,))
        result = cursor.fetchone()
        cursor.close()
        
        balance = float(result[0]) if result and result[0] is not None else 0.0
        logger.debug(f"User {user_id} has balance: ₹{balance:.2f}")
        return balance
    except Exception as e:
        logger.error(f"Error fetching user balance: {e}")
        return 0.0


def get_live_price(isin: str, stock_id: int = None) -> Optional[float]:
    """
    Fetch live stock price from WebSocket cache or Upstox API.
    
    Args:
        isin: ISIN code for the stock
        stock_id: Optional stock ID for WebSocket cache lookup
        
    Returns:
        Current price in INR, or None if unavailable
    """
    start_time = time.time()

    # Try WebSocket cache first (if stock_id provided)
    if stock_id:
        try:
            from services.live_price_cache import get_cached_price_by_stock_id, get_cache_age_seconds
            ws_price = get_cached_price_by_stock_id(stock_id)
            if ws_price is not None:
                age = get_cache_age_seconds(stock_id)
                if age is not None and age < 15:  # Fresh within 15 seconds
                    elapsed = time.time() - start_time
                    logger.debug(
                        f"WebSocket cache hit: stock_id={stock_id}, price=₹{ws_price}, "
                        f"age={age:.1f}s (took {elapsed:.3f}s)"
                    )
                    return ws_price
                else:
                    logger.debug(f"WebSocket price too old ({age:.1f}s), falling back to API")
        except Exception as e:
            logger.warning(f"WebSocket cache lookup failed for stock_id {stock_id}: {e}")

    # Check local API cache
    cached_price = _get_cached_price(isin)
    if cached_price is not None:
        elapsed = time.time() - start_time
        logger.debug(f"API cache hit: isin={isin}, price=₹{cached_price} (took {elapsed:.3f}s)")
        return cached_price

    # Fetch from Upstox API
    headers = {"Authorization": f"Bearer {UPSTOX_TOKEN}"}
    params = {"instrument_key": f"NSE_EQ|{isin}"}

    try:
        logger.debug(f"Fetching live price from Upstox API for ISIN: {isin}")
        response = requests.get(UPSTOX_URL, headers=headers, params=params, timeout=5)
        elapsed_api = time.time() - start_time
        
        response.raise_for_status()
        data = response.json()

        if "data" in data and data["data"]:
            first_key = list(data["data"].keys())[0]
            price = float(data["data"][first_key]["last_price"])
            logger.debug(
                f"Upstox API success: isin={isin}, price=₹{price} "
                f"(took {elapsed_api:.3f}s, status={response.status_code})"
            )
            _set_cached_price(isin, price)
            return price
        else:
            logger.warning(f"No valid price data in Upstox response for ISIN: {isin}")
            return None

    except requests.exceptions.Timeout:
        logger.error(f"Upstox API timeout for ISIN: {isin}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Upstox API request failed for ISIN {isin}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error fetching live price for ISIN {isin}: {e}")
        return None


def _validate_trade_input(
    stock_name: str, 
    intended_price: float, 
    quantity: int, 
    trade_type: str
) -> Optional[str]:
    """
    Validate trade input parameters.
    
    Args:
        stock_name: Company name
        intended_price: Expected price per share
        quantity: Number of shares
        trade_type: 'Buy' or 'Sell'
        
    Returns:
        Error message if validation fails, None if valid
    """
    # Validate stock name
    if not stock_name or not isinstance(stock_name, str) or len(stock_name.strip()) == 0:
        return "Stock name is required"
    
    # Validate trade type
    if trade_type not in ["Buy", "Sell"]:
        return "Invalid trade type. Must be 'Buy' or 'Sell'"
    
    # Validate quantity
    try:
        quantity = int(quantity)
        if quantity < MIN_ORDER_QUANTITY:
            return f"Quantity must be at least {MIN_ORDER_QUANTITY}"
        if quantity > MAX_ORDER_QUANTITY:
            return f"Quantity cannot exceed {MAX_ORDER_QUANTITY}"
    except (ValueError, TypeError):
        return "Quantity must be a valid integer"
    
    # Validate price
    try:
        price = float(intended_price)
        if price <= 0:
            return "Price must be positive"
        if price > 1000000:  # ₹10 lakh per share sanity check
            return "Price exceeds reasonable limit"
    except (ValueError, TypeError):
        return "Price must be a valid number"
    
    # Validate total order value
    total_value = quantity * intended_price
    if total_value > MAX_ORDER_VALUE:
        return f"Order value (₹{total_value:.2f}) exceeds maximum (₹{MAX_ORDER_VALUE:.2f})"
    
    return None


def execute_trade(
    stock_name: str, 
    intended_price: float, 
    user_id: int, 
    quantity: int, 
    trade_type: str, 
    confirm_code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Execute a buy or sell trade with comprehensive validation.
    
    Args:
        stock_name: Company name to trade
        intended_price: Expected price (for validation)
        user_id: User executing the trade
        quantity: Number of shares
        trade_type: 'Buy' or 'Sell'
        confirm_code: Optional confirmation code (legacy)
        
    Returns:
        Dictionary with status, message, and executed_price
    """
    start_total = time.time()
    logger.info(
        f"Trade execution started: user_id={user_id}, stock_name={stock_name}, "
        f"trade_type={trade_type}, quantity={quantity}, intended_price={intended_price}"
    )
    
    # Input validation
    validation_error = _validate_trade_input(stock_name, intended_price, quantity, trade_type)
    if validation_error:
        logger.warning(f"Trade validation failed for user {user_id}: {validation_error}")
        return {"status": "error", "message": validation_error}
    
    # Fetch stock information
    stock = get_stock_info(stock_name)
    if not stock:
        error_msg = f"Stock '{stock_name}' not found"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}

    stock_id, isin = stock["stock_id"], stock["isin"]
    logger.info(f"Stock resolved: stock_id={stock_id}, isin={isin}")

    try:
        with get_db_connection() as connection:
            # Check market status
            is_open, msg = is_market_open()
            live_price = None
            price_for_validation = intended_price

            if is_open:
                # Fetch live price from Upstox or WebSocket cache
                live_price = get_live_price(isin, stock_id=stock_id)
                if live_price is None:
                    error_msg = "Unable to fetch live price. Please try again."
                    logger.error(error_msg)
                    return {"status": "error", "message": error_msg}
                price_for_validation = live_price
                logger.info(f"Live price fetched: ₹{live_price}")
            
            # Validate holdings for Sell orders
            if trade_type == "Sell":
                user_qty = get_user_stock_quantity(connection, user_id, stock_id)
                logger.info(
                    f"Sell order validation: user_id={user_id}, stock_id={stock_id}, "
                    f"available_qty={user_qty}, requested_qty={quantity}"
                )
                if user_qty < quantity:
                    error_msg = f"Insufficient holdings. You have {user_qty} shares, need {quantity}."
                    logger.warning(error_msg)
                    return {"status": "error", "message": error_msg}
            
            # Validate balance for Buy orders
            elif trade_type == "Buy":
                user_balance = get_user_balance(connection, user_id)
                cost = quantity * price_for_validation
                logger.info(
                    f"Buy order validation: user_id={user_id}, available_balance=₹{user_balance:.2f}, "
                    f"required_cost=₹{cost:.2f}"
                )
                if user_balance < cost:
                    error_msg = (
                        f"Insufficient balance. Required: ₹{cost:.2f}, "
                        f"Available: ₹{user_balance:.2f}"
                    )
                    logger.warning(error_msg)
                    return {"status": "error", "message": error_msg}

            # If market is closed, create pending order
            if not is_open:
                logger.info(
                    f"Market closed: {msg}. Creating pending order for user {user_id}"
                )
                result = create_pending_order(connection, stock_id, user_id, trade_type, quantity)
                connection.commit()
                logger.info(f"Pending order created successfully: {result}")
                return result

            # Market is open - execute trade immediately
            logger.info(
                f"Executing {trade_type} trade: intended_price=₹{intended_price}, live_price=₹{live_price}"
            )
            
            # Price comparison for user transparency
            price_diff_pct = 0.0
            if intended_price > 0:
                price_diff_pct = abs((live_price - intended_price) / intended_price) * 100
            
            # Log significant price differences for monitoring
            if price_diff_pct > 2.0:
                logger.warning(
                    f"Significant price difference detected: intended=₹{intended_price}, "
                    f"live=₹{live_price}, diff={price_diff_pct:.2f}%"
                )
            
            cursor = connection.cursor()
            insert_query = """
                INSERT INTO Transactions (user_id, stock_id, transaction_type, quantity, price_at_trade)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_query, (user_id, stock_id, trade_type, quantity, live_price))
            connection.commit()
            cursor.close()

            elapsed = time.time() - start_total
            success_msg = f"{trade_type} executed successfully at ₹{live_price:.2f}"
            logger.info(
                f"Trade executed: {success_msg} (took {elapsed:.3f}s, "
                f"user_id={user_id}, stock_id={stock_id}, quantity={quantity})"
            )
            
            return {
                "status": "success",
                "message": success_msg,
                "executed_price": live_price,
                "intended_price": intended_price,
                "quantity": quantity,
                "total_value": live_price * quantity
            }

    except Exception as e:
        logger.error(f"Trade execution error for user {user_id}: {e}", exc_info=True)
        # Don't expose internal details in production
        error_message = "Trade execution failed. Please try again."
        if os.getenv("FLASK_ENV") == "development":
            error_message = f"Trade execution failed: {str(e)}"
        
        return {"status": "error", "message": error_message}
