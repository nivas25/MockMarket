from flask import Blueprint, request, jsonify
from controller.order.delete_order import delete_order

delete_order_bp = Blueprint('delete_order', __name__)

@delete_order_bp.route("/delete", methods=['DELETE'])
def delete_order_routes():
    print("Received request to delete order")
    data = request.get_json()
    if not data:
        return jsonify({'message': 'JSON body is required'}), 400
    order_id = data.get('order_id')
    if not order_id:
        return jsonify({'message': 'order_id is required'}), 400
    try:
        order_id = int(order_id)
    except ValueError:
        return jsonify({'message': 'order_id must be an integer'}), 400
    
    result = delete_order(order_id)
    if result['status'] == 'success':
        return jsonify(result), 200
    else:
        return jsonify(result), 400