from flask import Blueprint, jsonify

from services.metrics import metrics


metrics_bp = Blueprint("metrics", __name__)


@metrics_bp.get("/metrics")
def get_metrics():
    # Currently we only track Upstox REST calls under label 'upstox_rest'
    upstox_stats = metrics.get_stats("upstox_rest")
    return jsonify({
        "upstox_rest": upstox_stats,
    })
