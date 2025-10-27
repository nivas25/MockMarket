import os
from dotenv import load_dotenv
from utils.pretty_log import status_ok, status_warn
from services.index_scheduler import start_index_scheduler
from flask import Flask, jsonify
from flask_cors import CORS
from routes.google_auth_routes.auth_routes import auth_bp
from routes.fetch_routes.stock_price_fetch_routes import stock_prices_bp
from routes.fetch_routes.index_fetch_routes import index_fetch_bp
from routes.news_routes import news_bp
from routes.sentiment_routes import sentiment_bp
from routes.valid_user_routes.check_valid_user_routes import verify_bp
from routes.order_routes.buy_sell_order_routes import order_bp
from flask_jwt_extended import JWTManager

# Load environment variables
load_dotenv()

app = Flask(__name__)

# ✅ Set JWT secret key properly
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")

jwt = JWTManager(app)

# Enable CORS for auth routes
CORS(app)


@app.route('/')
def index():
    return "Hello, MockMarket Backend is Running!"

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(verify_bp, url_prefix='/user')
app.register_blueprint(stock_prices_bp, url_prefix='/stocks')
app.register_blueprint(index_fetch_bp, url_prefix='/indices')
app.register_blueprint(news_bp, url_prefix='/news')
app.register_blueprint(sentiment_bp, url_prefix='/sentiment')

app.register_blueprint(order_bp, url_prefix='/order')


if __name__ == '__main__':
    # Optionally start the in-process index fetcher so logs appear here
    enable_sched = (os.getenv("ENABLE_INDEX_SCHEDULER", "false").lower() in ("1", "true", "yes", "on"))
    interval = int(os.getenv("INDEX_FETCH_INTERVAL", "120"))

    # In debug mode, Flask spawns a reloader process; guard to avoid double-start
    is_reloader_main = os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug

    if enable_sched and is_reloader_main:
        try:
            start_index_scheduler(interval)
            status_ok(f"In-process index scheduler started (every {interval}s)")
        except Exception as e:
            status_warn(f"Failed to start scheduler: {e}")

    app.run(debug=True)
