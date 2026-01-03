"""
MockMarket Backend
Entry point for the trading simulation platform
"""

# Choose async mode before any monkey patching. Default to eventlet on Unix,
# but prefer threading on Windows to avoid eventlet socket timeouts locally.
import os
_default_async = "threading" if os.name == "nt" else "eventlet"
_async_mode = os.getenv("SOCKETIO_ASYNC_MODE", _default_async).lower()
if _async_mode == "eventlet":
    import eventlet
    eventlet.monkey_patch()

import time
import logging
from datetime import datetime, timezone
from typing import Optional

start_time = time.time()

from dotenv import load_dotenv
from flask import Flask, jsonify, g, request, make_response
from flask_cors import CORS
from flask_compress import Compress
from services.websocket_manager import init_socketio, socketio
from utils.logging_config import setup_logging

# Load environment variables first
load_dotenv()

# Initialize logging
setup_logging()
logger = logging.getLogger(__name__)

from routes.google_auth_routes.auth_routes import auth_bp
from routes.fetch_routes.stock_price_fetch_routes import stock_prices_bp
from routes.fetch_routes.index_fetch_routes import index_fetch_bp
from routes.news_routes import news_bp
from routes.sentiment_routes import sentiment_bp
from routes.valid_user_routes.check_valid_user_routes import verify_bp
from routes.order_routes.buy_sell_order_routes import trade_bp
from routes.fetch_balance.fetch_balance_routes import balance_bp
from routes.health_routes import health_bp
from routes.metrics_routes import metrics_bp
from routes.fetch_holdings.holdings_routes import holdings_bp
from routes.fetch_users.fetch_users_routes import fetch_users_bp
from routes.acess_routes.block_unblock_routes import manage_user_access_bp
from routes.watchlist_routes.watchlist_routes import watchlist_bp
from routes.order_routes.get_order_routes import get_orders_bp
from routes.order_routes.delete_order_routes import delete_order_bp
from routes.order_routes.re_order_routes import re_submit_trade_bp
from routes.watchlist_routes.get_watchlist_routes import get_watchlist_bp
from routes.delete_user_routes.delete_user_routes import delete_user_bp
from routes.watchlist_routes.delete_watchlist_routes import delete_watchlist_bp
from flask_jwt_extended import JWTManager
from routes.debug_routes import debug_bp




# Create Flask application
app = Flask(__name__)

# Security and Configuration
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
if not app.config["JWT_SECRET_KEY"]:
    logger.critical("JWT_SECRET_KEY not set in environment variables!")
    raise ValueError("JWT_SECRET_KEY is required for production")

app.config["JWT_ACCESS_TOKEN_EXPIRES"] = int(os.getenv("JWT_EXPIRES_DAYS", "3")) * 86400  # 3 days in seconds
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max request size
app.config["JSON_SORT_KEYS"] = False  # Preserve JSON key order for performance

jwt = JWTManager(app)

# CORS Configuration - Allow frontend origins
allowed_origins = os.getenv("ALLOWED_ORIGINS", "https://mockmarket1.vercel.app,http://localhost:3000").split(",")
CORS(app, resources={
    r"/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True,
        "max_age": 3600  # Cache preflight requests for 1 hour
    }
})


# Enable gzip compression
Compress(app)

# Performance monitoring, preflight handling and security context
@app.before_request
def before_request_handler():
    """Track request start time, handle CORS preflight early, and add security context."""
    # Capture start time for perf metrics
    g._t0 = time.perf_counter()
    g.request_id = request.headers.get('X-Request-ID', f"{time.time()}")

    # Central OPTIONS (preflight) handler to ensure Access-Control-Allow-* always returned
    if request.method == 'OPTIONS':
        origin = request.headers.get('Origin')
        if origin:
            # Normalize allowed origins list once
            _allowed = {o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(',') if o.strip()}
            if origin in _allowed:
                resp = make_response('', 200)
                resp.headers['Access-Control-Allow-Origin'] = origin
                resp.headers['Vary'] = 'Origin'
                resp.headers['Access-Control-Allow-Credentials'] = 'true'
                resp.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
                return resp
        # If origin not allowed, still return 200 (browser will block) to avoid 500 noise
        return make_response('', 200)

@app.after_request
def after_request_handler(response):
    """Add security headers, performance metrics, and logging"""
    try:
        # Performance tracking
        t0 = getattr(g, '_t0', None)
        if t0 is not None:
            dt_ms = (time.perf_counter() - t0) * 1000.0
            response.headers["Server-Timing"] = f"app;dur={dt_ms:.1f}"
            
            # Log slow requests
            threshold = float(os.getenv("PERF_LOG_THRESHOLD_MS", "500"))
            if dt_ms > threshold:
                logger.warning(
                    f"Slow request: {dt_ms:.0f}ms | {request.method} {request.path} | "
                    f"Status: {response.status_code} | IP: {request.remote_addr}"
                )
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Fallback CORS headers if Flask-CORS didn't set them (e.g. route-level decorator missing)
        origin = request.headers.get('Origin')
        if origin:
            allowed = {o.strip() for o in allowed_origins if o.strip()}
            if origin in allowed and 'Access-Control-Allow-Origin' not in response.headers:
                response.headers['Access-Control-Allow-Origin'] = origin
                response.headers['Vary'] = 'Origin'
                response.headers['Access-Control-Allow-Credentials'] = 'true'
                response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
                response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'

        # Cache control for API responses
        if request.path.startswith('/stocks/') or request.path.startswith('/indices/'):
            response.headers["Cache-Control"] = "public, max-age=10"  # 10s cache
        else:
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            
    except Exception as e:
        logger.error(f"Error in after_request_handler: {e}")
    
    return response

# Global error handlers
@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    logger.warning(f"404 Not Found: {request.path}")
    return jsonify({"error": "Endpoint not found", "path": request.path}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"500 Internal Server Error: {error}")
    return jsonify({"error": "Internal server error", "message": "Please try again later"}), 500

@app.errorhandler(Exception)
def handle_exception(error):
    """Handle uncaught exceptions"""
    logger.exception(f"Unhandled exception: {error}")
    return jsonify({"error": "An unexpected error occurred", "type": type(error).__name__}), 500

# Health check endpoint
@app.route('/')
def index():
    """Root endpoint - health check"""
    return jsonify({
        "status": "running",
        "service": "MockMarket Backend",
        "version": "1.0.0",
        "timestamp": time.time()
    })

# Register all blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(verify_bp, url_prefix='/user')
app.register_blueprint(stock_prices_bp, url_prefix='/stocks')
app.register_blueprint(index_fetch_bp, url_prefix='/indices')
app.register_blueprint(news_bp, url_prefix='/news')
app.register_blueprint(sentiment_bp, url_prefix='/sentiment')
app.register_blueprint(trade_bp, url_prefix='/order')
app.register_blueprint(balance_bp, url_prefix='/fetch')
app.register_blueprint(holdings_bp, url_prefix='/holdings')
app.register_blueprint(fetch_users_bp,url_prefix='/admin')
app.register_blueprint(manage_user_access_bp,url_prefix='/user')
app.register_blueprint(watchlist_bp, url_prefix='/watchlist')
app.register_blueprint(get_orders_bp, url_prefix='/fetch')
app.register_blueprint(delete_order_bp, url_prefix='/order')
app.register_blueprint(re_submit_trade_bp, url_prefix='/re_submit')
app.register_blueprint(get_watchlist_bp, url_prefix="/fetch")
app.register_blueprint(delete_user_bp, url_prefix="/user")
app.register_blueprint(delete_watchlist_bp, url_prefix="/delete")
app.register_blueprint(health_bp)
app.register_blueprint(metrics_bp)
app.register_blueprint(debug_bp, url_prefix='/debug')

# Initialize the shared SocketIO instance with the Flask app
init_socketio(app)

logger.info(f"Flask app initialized in {time.time() - start_time:.2f}s")


def _maybe_refresh_prices_on_start():
    """Refresh stock prices once at startup if data is stale or missing.

    Controlled by env:
      ENABLE_STARTUP_PRICE_REFRESH (default: true)
      STARTUP_REFRESH_MAX_AGE_MINUTES (default: 60)
    This is lightweight insurance for platforms like Render that may restart
    outside market hours and leave DB snapshots stale.
    """
    enabled = os.getenv("ENABLE_STARTUP_PRICE_REFRESH", "true").lower() in ("1", "true", "yes", "on")
    if not enabled:
        logger.info("Startup price refresh disabled via env")
        return

    max_age_min = int(os.getenv("STARTUP_REFRESH_MAX_AGE_MINUTES", "60"))

    from db_pool import get_connection
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT MAX(as_of) FROM Stock_Prices")
        row = cursor.fetchone()
        last_ts = row[0] if row else None

        if last_ts:
            # Ensure timezone aware comparisons
            last_dt = last_ts if hasattr(last_ts, 'tzinfo') and last_ts.tzinfo else last_ts.replace(tzinfo=timezone.utc)
            age_minutes = (datetime.now(timezone.utc) - last_dt).total_seconds() / 60.0
            if age_minutes <= max_age_min:
                logger.info(f"Startup price refresh skipped (latest {age_minutes:.1f}m old <= {max_age_min}m)")
                return
            logger.info(f"Startup price refresh triggered (latest {age_minutes:.1f}m old > {max_age_min}m)")
        else:
            logger.info("Startup price refresh triggered (no price records found)")

    finally:
        cursor.close()
        conn.close()

    from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
    try:
        fetch_all_stock_prices(save_to_db=True)
        logger.info("Startup price refresh completed")
    except Exception as e:
        logger.warning(f"Startup price refresh failed: {e}")

def initialize_services():
    """Initialize all background services"""
    services_started = []
    services_failed = []
    
    # Initialize database connection pool
    try:
        from db_pool import initialize_pool
        initialize_pool()
        services_started.append("Database Connection Pool")
        logger.info("✓ Database connection pool initialized")
    except Exception as e:
        services_failed.append(("Database Pool", str(e)))
        logger.error(f"✗ Failed to initialize DB pool: {e}")

    # Optional: refresh stale prices on boot so Render restarts don't leave stale DB data
    try:
        _maybe_refresh_prices_on_start()
        services_started.append("Startup Price Refresh")
    except Exception as e:
        services_failed.append(("Startup Price Refresh", str(e)))
        logger.warning(f"⚠ Startup price refresh skipped: {e}")
    
    # Start index service scheduler
    try:
        from services.index_service_scheduler import start_index_service_scheduler
        start_index_service_scheduler()
        services_started.append("Index Service Scheduler")
        logger.info("✓ Index service scheduler started")
    except Exception as e:
        services_failed.append(("Index Scheduler", str(e)))
        logger.error(f"✗ Failed to start index service scheduler: {e}")
    
    # Start stock service scheduler
    try:
        from services.stock_service_scheduler import start_stock_service_scheduler
        start_stock_service_scheduler()
        services_started.append("Stock Service Scheduler")
        logger.info("✓ Stock service scheduler started")
    except Exception as e:
        services_failed.append(("Stock Scheduler", str(e)))
        logger.error(f"✗ Failed to start stock service scheduler: {e}")
    
    # Start hot cache refresher
    try:
        from services.hot_cache_scheduler import start_hot_cache_scheduler
        start_hot_cache_scheduler()
        services_started.append("Hot Cache Refresher")
        logger.info("✓ Hot cache scheduler started")
    except Exception as e:
        services_failed.append(("Hot Cache", str(e)))
        logger.warning(f"⚠ Hot cache not started: {e}")
    
    # Start EOD candle scheduler
    try:
        from services.eod_candle_scheduler import start_eod_candle_scheduler
        start_eod_candle_scheduler()
        services_started.append("EOD Candle Scheduler")
        logger.info("✓ EOD candle scheduler started")
    except Exception as e:
        services_failed.append(("EOD Scheduler", str(e)))
        logger.warning(f"⚠ EOD candle scheduler not started: {e}")
    
    # Log summary
    logger.info(f"Services started: {len(services_started)}/{len(services_started) + len(services_failed)}")
    if services_failed:
        logger.warning(f"Failed services: {[name for name, _ in services_failed]}")
    
    return services_started, services_failed

if __name__ == '__main__':
    # 1. Initialize background services
    initialize_services()
    
    port = 5000
    host = "0.0.0.0"
    
    # 2. Log exactly what's happening
    logger.info(f"Starting Production Server on {host}:{port}")

    # 3. Use SocketIO run but with better error handling for Render
    try:
        socketio.run(
            app,
            host=host,
            port=port,
            debug=False,
            use_reloader=False,
            log_output=True # Keep this True to see why it crashes if it does
        )
    except Exception as e:
        logger.error(f"Server failed to start: {e}")