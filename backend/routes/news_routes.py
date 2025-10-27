from flask import Blueprint, jsonify, request
from services.news_service import fetch_latest_news

news_bp = Blueprint('news_bp', __name__)


@news_bp.route('/latest', methods=['GET'])
def latest_news():
    try:
        limit = int(request.args.get('limit', 12))
        q = request.args.get('q')
        force = request.args.get('refresh', 'false').lower() == 'true'

        items = fetch_latest_news(force_refresh=force)

        # Optional keyword filter
        if q:
            q_low = q.lower()
            items = [
                it for it in items
                if q_low in (it.get('headline') or '').lower()
                or q_low in (it.get('summary') or '').lower()
            ]

        items = items[:limit]
        return jsonify({
            "status": "success",
            "data": items,
            "count": len(items)
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
