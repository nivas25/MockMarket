# routes/trade_routes.py

from flask import Blueprint, request, jsonify
from controller.order.buy_sell_order import execute_trade
import os
import logging
from flask_cors import cross_origin

logger = logging.getLogger(__name__)

trade_bp = Blueprint("trade_bp", __name__)
_ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

@trade_bp.route("/trade", methods=["POST", "OPTIONS"])
@cross_origin(
    origins=_ALLOWED_ORIGINS,
    methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True,
    max_age=3600
)
def trade_stock():
    if request.method == 'OPTIONS':
        logger.debug("Preflight /order/trade responded")
        return '', 200

    logger.info("Trade request received")
    data = request.get_json()
    logger.debug(f"Trade payload: {data}")

    required_fields = ["stock_name", "intended_price", "user_id", "quantity", "trade_type"]
    if not all(field in data for field in required_fields):
        logger.warning("Trade request missing required fields")
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
    
    status_code = 200
    if result.get("status") == "error":
        status_code = 400
        
    logger.info(f"Trade processed; returning result with status {status_code}")
    return jsonify(result), status_code
