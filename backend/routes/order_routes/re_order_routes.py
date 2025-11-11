# routes/order_routes/re_order_routes.py
"""
Production-ready route for re-submitting pending orders.
Executes trades and cleans up pending orders with proper validation.
"""

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from controller.order.buy_sell_order import execute_trade
from controller.order.delete_order import delete_order
from utils.request_validators import require_fields, validate_positive_integer, validate_positive_number, validate_trade_type
import logging

logger = logging.getLogger(__name__)

re_submit_trade_bp = Blueprint('trade', __name__)


@re_submit_trade_bp.route('/order', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["http://localhost:3000"], methods=["POST", "OPTIONS"], headers=["Content-Type"])
@require_fields('stock_name', 'intended_price', 'quantity', 'trade_type', 'user_id')
def trade():
    """
    Execute a trade order (immediate or pending).
    Validates input and deletes pending order if successful.
    """
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    
    # Extract fields
    stock_name = data.get('stock_name', '').strip()
    intended_price_raw = data.get('intended_price')
    quantity_raw = data.get('quantity')
    trade_type = data.get('trade_type', '').strip()
    user_id_raw = data.get('user_id')
    order_id = data.get('order_id')  # Optional: for deleting pending order
    confirm_code = data.get('confirm_code')  # Legacy field

    # Validate and convert types
    is_valid, user_id, error_msg = validate_positive_integer(user_id_raw, 'user_id')
    if not is_valid:
        logger.warning(f"Invalid user_id: {error_msg}")
        return jsonify({'status': 'error', 'message': error_msg}), 400

    is_valid, quantity, error_msg = validate_positive_integer(quantity_raw, 'quantity')
    if not is_valid:
        logger.warning(f"Invalid quantity: {error_msg}")
        return jsonify({'status': 'error', 'message': error_msg}), 400

    is_valid, intended_price, error_msg = validate_positive_number(intended_price_raw, 'intended_price')
    if not is_valid:
        logger.warning(f"Invalid intended_price: {error_msg}")
        return jsonify({'status': 'error', 'message': error_msg}), 400

    is_valid, error_msg = validate_trade_type(trade_type)
    if not is_valid:
        logger.warning(f"Invalid trade_type: {error_msg}")
        return jsonify({'status': 'error', 'message': error_msg}), 400

    # Log the trade request
    logger.info(
        f"Trade request: user_id={user_id}, stock={stock_name}, "
        f"type={trade_type}, qty={quantity}, price={intended_price}, "
        f"order_id={order_id}"
    )

    try:
        # Execute the trade
        result = execute_trade(
            stock_name=stock_name,
            intended_price=intended_price,
            user_id=user_id,
            quantity=quantity,
            trade_type=trade_type,
            confirm_code=confirm_code
        )
        
        # If trade successful and order_id provided, delete pending order
        if result.get('status') == 'success' and order_id:
            try:
                order_id_int = int(order_id)
                delete_result = delete_order(order_id_int, user_id)
                
                if delete_result.get('status') == 'success':
                    logger.info(f"Pending order {order_id} deleted after successful trade")
                else:
                    logger.warning(
                        f"Failed to delete pending order {order_id}: "
                        f"{delete_result.get('message')}"
                    )
            except (ValueError, TypeError) as e:
                logger.error(f"Invalid order_id format: {order_id} - {e}")
            except Exception as e:
                logger.error(f"Error deleting pending order {order_id}: {e}")
                # Don't fail the whole request if order deletion fails
        
        return jsonify(result), 200 if result.get('status') == 'success' else 400
        
    except Exception as e:
        logger.error(f"Trade execution error: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': 'Trade execution failed. Please try again.'
        }), 500

