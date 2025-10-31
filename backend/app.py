import os
import sys
import time
import logging  # For suppressing Werkzeug logs
import threading  # For daemon schedulers

# Force disable reloader globally via env (before any Flask import)
os.environ['WERKZEUG_RUN_MAIN'] = 'true'
os.environ['FLASK_DEBUG'] = '0'  # Override any env debug

# Early monkey-patch for SocketIO (install eventlet if missing)
try:
    import eventlet
    eventlet.monkey_patch(all=True)  # Patch everything early
    print("✅ Eventlet monkey-patched successfully")
except ImportError:
    print("❌ ERROR: Install eventlet with 'pip install eventlet' and restart")

start_time = time.time()

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

# Import ONLY init_socketio initially (not socketio yet)
from services.websocket_manager import init_socketio

# Suppress Werkzeug dev server logs (noisy in debug)
logging.getLogger('werkzeug').setLevel(logging.ERROR)

# Lazy imports for schedulers
def get_index_scheduler():
    from services.index_scheduler import start_index_scheduler
    return start_index_scheduler

def get_stock_scheduler():
    from services.stock_scheduler import start_stock_scheduler
    return start_stock_scheduler

# Route imports
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
from flask_jwt_extended import JWTManager

# Load env
load_dotenv()

# Create app with debug explicitly OFF
app = Flask(__name__)
app.debug = False  # Force off to kill reloader

# JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)

# CORS
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def index():
    return "Hello, MockMarket Backend is Running!"

# Register blueprints
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(verify_bp, url_prefix='/user')
app.register_blueprint(stock_prices_bp, url_prefix='/stocks')
app.register_blueprint(index_fetch_bp, url_prefix='/indices')
app.register_blueprint(news_bp, url_prefix='/news')
app.register_blueprint(sentiment_bp, url_prefix='/sentiment')
app.register_blueprint(trade_bp, url_prefix='/order')
app.register_blueprint(balance_bp, url_prefix='/fetch')
app.register_blueprint(holdings_bp, url_prefix='/holdings')
app.register_blueprint(health_bp)
app.register_blueprint(metrics_bp)

# Init SocketIO (sets global socketio)
init_socketio(app)

# NOW re-import socketio to get the updated instance
from services.websocket_manager import socketio

print(f"✅ Flask app initialized in {time.time() - start_time:.2f}s (debug=False, no reloader)")

def start_daemon_scheduler(func, *args, name="Scheduler"):
    """Start scheduler in daemon thread to avoid blocking WSGI."""
    def wrapper():
        try:
            func(*args)
        except Exception as e:
            print(f"❌ {name} failed: {e}")
    thread = threading.Thread(target=wrapper, daemon=True, name=name)
    thread.start()
    print(f"✅ {name} started in daemon thread")

if __name__ == '__main__':
    # Env config for schedulers
    enable_sched = (os.getenv("ENABLE_INDEX_SCHEDULER", "false").lower() in ("1", "true", "yes", "on"))
    interval = int(os.getenv("INDEX_FETCH_INTERVAL", "120"))
    enable_stock_sched = (os.getenv("ENABLE_STOCK_SCHEDULER", "true").lower() in ("1", "true", "yes", "on"))
    stock_interval = int(os.getenv("STOCK_FETCH_INTERVAL", "120"))

    # ✅ Wrap scheduler startup in try-except to isolate failures
    try:
        if enable_sched:
            start_index_scheduler = get_index_scheduler()
            start_daemon_scheduler(start_index_scheduler, interval, name="Index Scheduler")

        if enable_stock_sched:
            start_stock_scheduler = get_stock_scheduler()
            start_daemon_scheduler(start_stock_scheduler, stock_interval, name="Stock Scheduler")

        # ✅ Service schedulers
        try:
            from services.index_service_scheduler import start_index_service_scheduler
            start_daemon_scheduler(start_index_service_scheduler, name="Index Service Scheduler")
        except Exception as e:
            print(f"❌ Failed index service scheduler: {e}")

        try:
            from services.stock_service_scheduler import start_stock_service_scheduler
            start_daemon_scheduler(start_stock_service_scheduler, name="Stock Service Scheduler")
        except Exception as e:
            print(f"❌ Failed stock service scheduler: {e}")

    except Exception as e:
        print(f"⚠️ Scheduler startup error (ignored): {e}")

    # ✅ Run SocketIO safely
    if socketio is None:
        print("❌ FATAL: socketio is still None after init! Check websocket_manager.py")
        sys.exit(1)

    print("🚀 Starting SocketIO server (no debug, no reloader)")

    try:
        socketio.run(
            app,
            host='0.0.0.0',
            port=5000,
            debug=False,
            use_reloader=False,
            log_output=True
        )
    except Exception as e:
        print(f"❌ SocketIO crashed: {e}")
        # ✅ Keep app alive even if scheduler blocks (no sys.exit here)
        while True:
            time.sleep(10)
