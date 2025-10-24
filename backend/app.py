# File: app.py

import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate  # For database migrations
from flask_cors import CORS          # For Next.js frontend
from flask_jwt_extended import JWTManager # For authentication

# Load environment variables from .env file
load_dotenv()

# --- 1. Initialize Extensions (Unbound) ---
# We create the extension instances here, but don't connect them
# to a specific app yet.
db = SQLAlchemy()
migrate = Migrate()

# --- 2. Application Factory Function ---
def create_app():
    """
    Creates and configures the Flask application.
    This is the "Application Factory" pattern.
    """
    app = Flask(__name__)

    # --- 3. Load Configuration ---
    
    # SSL arguments for PlanetScale/MySQL
    ssl_args = {'ssl_ca': os.path.join(os.path.dirname(__file__), 'ca.pem')}
    
    # Database Configuration
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'connect_args': ssl_args}
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # JWT Configuration
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    if not app.config['JWT_SECRET_KEY']:
        raise ValueError("JWT_SECRET_KEY environment variable not set. Please set it in your .env file.")

    # --- 4. Initialize Extensions with the App ---
    # Now we bind the extensions to our 'app' instance
    db.init_app(app)
    migrate.init_app(app, db)
    jwt = JWTManager(app)

    # Configure CORS to allow your Next.js frontend (localhost:3000)
    # to make requests to your Flask backend (localhost:5001)
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

    # --- 5. Import and Register Blueprints ---
    # This is where your routes from other files get plugged in.
    with app.app_context():
        # Import models *after* db is initialized but *before* blueprints
        
        # from models import User # <--- THIS IS COMMENTED OUT FOR TESTING
        
        # Import blueprints
        from routes.auth import auth_bp
        
        # Register the auth blueprint
        # All routes in auth_bp will be prefixed with /api/v1/auth
        app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')

    # --- 6. Register Routes (if any) ---
    # Simple routes can stay here.
    @app.route('/')
    def index():
        return "Hello, MockMarket Backend is Running!"

    @app.route('/test_db')
    def test_db_connection():
        try:
            # A more lightweight way to test connection
            db.session.execute(db.text('SELECT 1'))
            return jsonify({"status": "success", "message": "Database connected successfully!"}), 200
        except Exception as e:
            return jsonify({"status": "error", "message": str(e)}), 500
            
    # --- 7. (Optional) Add JWT Error Handlers ---
    # You can add custom responses for expired/invalid tokens
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"message": "Token is invalid."}), 401

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"message": "Token has expired."}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"message": "Request does not contain an access token."}), 401


    return app

# --- 8. Run the Application ---
if __name__ == '__main__':
    # Create the app instance using the factory
    app = create_app()
    # Run on port 5001 to avoid conflict with Next.js (3000)
    app.run(debug=True, port=5001)