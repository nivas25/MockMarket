from flask import Blueprint, request, jsonify
from controller.order.buy_sell_order import process_order

order_bp = Blueprint("order", __name__)

@order_bp.route("/price", methods=["POST"])
def handle_order():
    try:
        payload = request.get_json()
        response = process_order(payload)
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
