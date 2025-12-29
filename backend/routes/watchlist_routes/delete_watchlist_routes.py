from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from controller.watchlist.delete_watchlist import delete_watchlist
import os
import logging

logger = logging.getLogger(__name__)

delete_watchlist_bp = Blueprint('delete_watchlist_bp', __name__)

_ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

@delete_watchlist_bp.route('/watchlist', methods=['DELETE', 'OPTIONS'])
@cross_origin(
    origins=_ALLOWED_ORIGINS,
    methods=["DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True,
    max_age=3600
)
def delete_watchlist_route():
    if request.method == 'OPTIONS':
        logger.debug("Preflight /delete watchlist responded")
        return '', 200  # Handle CORS preflight request

    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "status": "error",
                "message": "No JSON body found in request"
            }), 400

        watchlist_id = data.get("watchlist_id")
        if not watchlist_id:
            return jsonify({
                "status": "error",
                "message": "Missing required field: watchlist_id"
            }), 400

        result = delete_watchlist(int(watchlist_id))
        if result.get("status") == "success":
            return jsonify(result), 200
        else:
            return jsonify(result), 400

    except Exception as e:
        print("Error in delete_watchlist_route:", str(e))
        return jsonify({
            "status": "error",
            "message": f"Server error: {str(e)}"
        }), 500
