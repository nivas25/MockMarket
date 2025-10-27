from flask import Blueprint, jsonify
from services.sentiment_service import calculate_market_sentiment

sentiment_bp = Blueprint('sentiment_bp', __name__)


@sentiment_bp.route('/market', methods=['GET'])
def market_sentiment():
    try:
        sentiment_data = calculate_market_sentiment()
        return jsonify({
            "status": "success",
            "data": sentiment_data
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
