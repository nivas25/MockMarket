# order_status_routes.py

from flask import Blueprint, request, jsonify
from db_pool import get_connection
from controller.order.order_status import create_pending_order

order_status_bp = Blueprint("order_status", __name__)

@order_status_bp.route("/status/execute", methods=["POST"])
def add_pending_order():
    data = request.json

    required_fields = ["stock_id", "user_id", "action", "quantity"]
    if not all(field in data for field in required_fields):
        return jsonify({"status": "error", "message": "Missing fields"}), 400
    
    stock_id = data["stock_id"]
    user_id = data["user_id"]
    action = data["action"]
    quantity = data["quantity"]

    try:
        conn = get_connection()
        result = create_pending_order(conn, stock_id, user_id, action, quantity)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        if "conn" in locals():
            conn.close()
