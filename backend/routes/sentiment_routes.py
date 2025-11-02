from flask import Blueprint, jsonify
from services.sentiment_service import calculate_market_sentiment
from services.cache_service import get_cache

sentiment_bp = Blueprint('sentiment_bp', __name__)

# Initialize cache
cache = get_cache()


@sentiment_bp.route('/market', methods=['GET'])
def market_sentiment():
    try:
        # Cache for 30 seconds (sentiment doesn't change that frequently)
        sentiment_data = cache.get_or_compute(
            "market_sentiment",
            calculate_market_sentiment,
            ttl_seconds=30
        )
        return jsonify({
            "status": "success",
            "data": sentiment_data
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
