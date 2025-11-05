from flask import Blueprint, request, jsonify
from controller.watchlist.get_watchlist import get_user_watchlists

get_watchlist_bp = Blueprint('watchlist', __name__)

@get_watchlist_bp.route('/watchlists', methods=['POST'])
def fetch_user_watchlists():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No JSON data provided.'
            }), 400

        user_id = data.get('user_id')
        if not user_id:
            return jsonify({
                'status': 'error',
                'message': 'user_id is required.'
            }), 400

        result = get_user_watchlists(user_id)
        return jsonify(result), (200 if result['status']=="success" else 400)

    except Exception:
        return jsonify({
            'status': 'error',
            'message': 'Unexpected server error while fetching watchlist.'
        }), 500
