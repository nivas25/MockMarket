import requests
import os

UPSTOX_TOKEN = os.getenv("UPSTOX_ACCESS_TOKEN")  # from .env file
UPSTOX_URL = "https://api.upstox.com/v2/market-quote/quotes"

def get_live_price(symbol):
    """Fetch current market price from Upstox API"""
    print(f"fetching live price for {symbol} from Upstox")
    headers = {"Authorization": f"Bearer {UPSTOX_TOKEN}"}
    params = {"symbol": symbol}
    res = requests.get(UPSTOX_URL, headers=headers, params=params)

    if res.status_code != 200:
        raise Exception("Failed to fetch price from Upstox API")

    data = res.json()
    return float(data["data"][symbol]["last_price"])


def execute_order(symbol, side, qty, price):
    """Mock or real order execution logic"""
    # ⚙️ In future: integrate Upstox Order Placement API here
    print(f"✅ Executing {side} {qty} of {symbol} at {price}")
    return {
        "symbol": symbol,
        "side": side,
        "price": price,
        "quantity": qty,
        "message": "Order executed successfully"
    }


def process_order(payload):
    """Main controller function for buy/sell orders"""
    symbol = payload.get("symbol")
    side = payload.get("side")  # 'BUY' or 'SELL'
    qty = payload.get("quantity")
    user_price = float(payload.get("price"))
    proceed = payload.get("proceed", False)

    live_price = get_live_price(symbol)

    # 🔍 Price mismatch check
    if abs(live_price - user_price) > 0.01 and not proceed:
        return {
            "success": False,
            "price_changed": True,
            "message": f"Price changed from {user_price} to {live_price}",
            "current_price": live_price
        }

    # ✅ Execute order
    order = execute_order(symbol, side, qty, live_price)
    return {"success": True, "executed": True, **order}
