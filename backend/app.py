import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS
from routes.auth_routes import auth_bp
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

if __name__ == '__main__':
    app.run(debug=True)
