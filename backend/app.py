import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from routes.google_auth_routes.auth_routes import auth_bp
from routes.fetch_routes.stock_price_fetch_routes import stock_prices_bp
from routes.valid_user_routes.check_valid_user_routes import verify_bp
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


app.register_blueprint(stock_prices_bp, url_prefix='/stocks')

app.register_blueprint(verify_bp, url_prefix='/user')


if __name__ == '__main__':
    app.run(debug=True)
