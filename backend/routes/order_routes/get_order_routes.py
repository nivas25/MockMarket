# routes/order_routes/get_order_routes.py

from flask import Blueprint, jsonify, request
from controller.order.get_orders import get_user_orders

get_orders_bp = Blueprint('get_orders', __name__)

@get_orders_bp.route('/api/orders', methods=['POST'])
def fetch_user_orders():
    data = request.get_json()
    if not data:
        return jsonify({'message': 'JSON body is required'}), 400
    user_id = data.get('user_id')
    if not user_id:
        return jsonify({'message': 'user_id is required'}), 400
    try:
        user_id = int(user_id)
    except ValueError:
        return jsonify({'message': 'user_id must be an integer'}), 400
    
    orders = get_user_orders(user_id)
    if not orders:
        return jsonify({'message': 'No orders found', 'orders': []}), 200
    return jsonify({'message': 'Orders fetched successfully', 'orders': orders}), 200