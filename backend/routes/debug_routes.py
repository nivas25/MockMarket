"""
Debug routes for testing WebSocket functionality
Use these endpoints to test Socket.IO without waiting for market hours
"""
from flask import Blueprint, jsonify
from services.websocket_manager import socketio
from datetime import datetime
import random

debug_bp = Blueprint('debug_bp', __name__)


@debug_bp.route('/test-socket', methods=['GET'])
def test_socket():
    """
    Test Socket.IO by emitting sample index data
    This simulates what the live service would send during market hours
    """
    try:
        # Generate fake index data
        test_indices = [
            {
                "name": "NIFTY 50",
                "ltp": 19500.50 + random.uniform(-100, 100),
                "open": 19450.00,
                "high": 19550.00,
                "low": 19400.00,
                "prev_close": 19480.00,
                "change_value": random.uniform(-50, 50),
                "change_percent": random.uniform(-0.5, 0.5),
                "tag": "Benchmark",
                "last_updated": datetime.now().isoformat()
            },
            {
                "name": "SENSEX",
                "ltp": 65200.75 + random.uniform(-200, 200),
                "open": 65100.00,
                "high": 65300.00,
                "low": 65050.00,
                "prev_close": 65150.00,
                "change_value": random.uniform(-100, 100),
                "change_percent": random.uniform(-0.3, 0.3),
                "tag": "Benchmark",
                "last_updated": datetime.now().isoformat()
            },
            {
                "name": "BANKNIFTY",
                "ltp": 44500.25 + random.uniform(-150, 150),
                "open": 44450.00,
                "high": 44600.00,
                "low": 44350.00,
                "prev_close": 44480.00,
                "change_value": random.uniform(-80, 80),
                "change_percent": random.uniform(-0.4, 0.4),
                "tag": "Banking",
                "last_updated": datetime.now().isoformat()
            },
            {
                "name": "INDIA VIX",
                "ltp": 13.50 + random.uniform(-1, 1),
                "open": 13.25,
                "high": 13.75,
                "low": 13.10,
                "prev_close": 13.40,
                "change_value": random.uniform(-0.5, 0.5),
                "change_percent": random.uniform(-2, 2),
                "tag": "Volatility",
                "last_updated": datetime.now().isoformat()
            }
        ]
        
        # Emit to all connected clients
        socketio.emit('indices_update', {
            "status": "test",
            "data": test_indices,
            "timestamp": datetime.now().isoformat()
        })
        
        return jsonify({
            "status": "success",
            "message": "Test data emitted via Socket.IO",
            "emitted_count": len(test_indices),
            "tip": "Check your browser console for '[socket] connected' and watch the indices strip update"
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@debug_bp.route('/test-stock-prices', methods=['GET'])
def test_stock_prices():
    """
    Test Socket.IO by emitting sample stock price data
    This simulates what the stock fetcher would send during market hours
    """
    try:
        # Generate fake stock price data
        test_stocks = [
            {"symbol": "RELIANCE", "ltp": 2500.50 + random.uniform(-10, 10), "as_of": datetime.now().isoformat()},
            {"symbol": "TCS", "ltp": 3600.25 + random.uniform(-20, 20), "as_of": datetime.now().isoformat()},
            {"symbol": "INFY", "ltp": 1450.75 + random.uniform(-15, 15), "as_of": datetime.now().isoformat()},
            {"symbol": "HDFCBANK", "ltp": 1650.00 + random.uniform(-12, 12), "as_of": datetime.now().isoformat()},
            {"symbol": "ICICIBANK", "ltp": 950.50 + random.uniform(-8, 8), "as_of": datetime.now().isoformat()},
        ]
        
        # Emit to all connected clients
        socketio.emit('prices_batch', test_stocks)
        
        return jsonify({
            "status": "success",
            "message": "Test stock prices emitted via Socket.IO",
            "emitted_count": len(test_stocks),
            "tip": "Check your browser console and watch for live price updates"
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@debug_bp.route('/socket-status', methods=['GET'])
def socket_status():
    """
    Check Socket.IO server status
    """
    try:
        return jsonify({
            "status": "success",
            "socket_io_initialized": socketio is not None,
            "async_mode": socketio.async_mode if socketio else None,
            "message": "Socket.IO server is ready",
            "test_endpoints": {
                "indices": "/debug/test-socket",
                "stock_prices": "/debug/test-stock-prices"
            }
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
