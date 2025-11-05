"""
Watchlist Routes
API endpoints for managing user watchlists
"""
from flask import Blueprint, request, jsonify
from controller.watchlist.watchlist_controller import (
    add_stock_to_watchlist,
    check_stock_in_watchlist,
    remove_stock_from_watchlist
)
import jwt
import os

watchlist_bp = Blueprint('watchlist_bp', __name__)

# JWT secret (should match your auth setup - use JWT_SECRET_KEY)
JWT_SECRET = os.getenv('JWT_SECRET_KEY', 'your-secret-key')


def get_user_id_from_token():
    """Extract user_id from JWT token in Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        print("[watchlist_routes] No Authorization header or invalid format")
        return None
    
    token = auth_header.split(' ')[1]
    try:
        decoded = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        user_id = decoded.get('sub', {}).get('user_id')
        print(f"[watchlist_routes] ✅ Token decoded successfully, user_id: {user_id}")
        return user_id
    except jwt.ExpiredSignatureError:
        print("[watchlist_routes] ❌ Token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[watchlist_routes] ❌ Invalid token: {e}")
        return None
    except Exception as e:
        print(f"[watchlist_routes] ❌ Error decoding token: {e}")
        return None


@watchlist_bp.route('/add-stock', methods=['POST'])
def add_stock():
    """Add a stock to user's watchlist (receives user_id from frontend like OrderPanel)"""
    data = request.get_json()
    user_id = data.get('user_id')
    stock_id = data.get('stock_id')
    
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required"}), 400
    
    if not stock_id:
        return jsonify({"success": False, "message": "stock_id is required"}), 400
    
    print(f"[watchlist_routes] Adding stock_id={stock_id} for user_id={user_id}")
    return add_stock_to_watchlist(user_id, stock_id)


@watchlist_bp.route('/check-stock', methods=['GET'])
def check_stock():
    """Check if a stock is in user's watchlist (receives user_id via query params)"""
    user_id = request.args.get('user_id', type=int)
    stock_id = request.args.get('stock_id', type=int)
    
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required"}), 400
    
    if not stock_id:
        return jsonify({"success": False, "message": "stock_id is required"}), 400
    
    return check_stock_in_watchlist(user_id, stock_id)


@watchlist_bp.route('/remove-stock', methods=['DELETE'])
def remove_stock():
    """Remove a stock from user's watchlist (receives user_id from frontend)"""
    data = request.get_json()
    user_id = data.get('user_id')
    stock_id = data.get('stock_id')
    
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required"}), 400
    
    if not stock_id:
        return jsonify({"success": False, "message": "stock_id is required"}), 400
    
    return remove_stock_from_watchlist(user_id, stock_id)
