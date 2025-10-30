# routes/trade_routes.py

from flask import Blueprint, request, jsonify
from controller.order.buy_sell_order import execute_trade

trade_bp = Blueprint("trade_bp", __name__)

@trade_bp.route("/trade", methods=["POST"])
def trade_stock():
    print("[🟡] Received trade request")  # Add this
    data = request.get_json()
    print("[🟢] Payload:", data)  # Add this

    required_fields = ["stock_name", "intended_price", "user_id", "quantity", "trade_type"]
    if not all(field in data for field in required_fields):
        print("[🔴] Missing fields")
        return jsonify({
            "status": "error",
            "message": "Missing one or more required fields."
        }), 400

    result = execute_trade(
        stock_name=data["stock_name"],
        intended_price=float(data["intended_price"]),
        user_id=int(data["user_id"]),
        quantity=int(data["quantity"]),
        trade_type=data["trade_type"],
        confirm_code=data.get("confirm_code")
    )
    print("[✅] Sending result:", result)
    return jsonify(result)
