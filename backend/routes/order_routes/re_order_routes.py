# routes/order_routes/re_order_routes.py
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from controller.trade_controller import re_submit

re_submit_trade_bp = Blueprint('trade', __name__)

@re_submit_trade_bp.route('/order', methods=['POST', 'OPTIONS'])
@cross_origin(origins=["http://localhost:3000"], methods=["POST", "OPTIONS"], headers=["Content-Type"])
def trade():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    stock_name = data.get('stock_name')
    intended_price = data.get('intended_price')
    quantity = data.get('quantity')
    trade_type = data.get('trade_type')
    confirm_code = data.get('confirm_code')
    user_id = data.get('user_id')
    order_id = data.get('order_id')  # ✅ NEW: include order_id from frontend

    # ✅ Check missing fields
    missing_fields = []
    if stock_name is None or stock_name == '':
        missing_fields.append('stock_name')
    if intended_price is None or (isinstance(intended_price, str) and intended_price == ''):
        missing_fields.append('intended_price')
    if quantity is None or (isinstance(quantity, str) and quantity == ''):
        missing_fields.append('quantity')
    if trade_type is None or trade_type == '':
        missing_fields.append('trade_type')
    if user_id is None or str(user_id) == '':
        missing_fields.append('user_id')

    if missing_fields:
        return jsonify({
            'status': 'error',
            'message': f'Missing required fields: {", ".join(missing_fields)}'
        }), 400

    try:
        result = re_submit(
            stock_name=stock_name,
            intended_price=float(intended_price) if intended_price is not None else 0.0,
            user_id=int(user_id),
            quantity=int(quantity),
            trade_type=trade_type,
            confirm_code=confirm_code,
            order_id=int(order_id) if order_id is not None else None  # ✅ Pass it down
        )
    except ValueError as e:
        return jsonify({'status': 'error', 'message': f'Invalid data types: {str(e)}'}), 400

    return jsonify(result)
