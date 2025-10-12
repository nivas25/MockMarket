# File: app.py

import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy

load_dotenv()

app = Flask(__name__)

# --- The Correct Configuration ---

# Path to the CA certificate you downloaded
# os.path.join(os.path.dirname(__file__), 'ca.pem') creates a reliable path to the file
ssl_args = {'ssl_ca': os.path.join(os.path.dirname(__file__), 'ca.pem')}

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URI')

# Pass the SSL arguments to the database engine
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'connect_args': ssl_args
}

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# ---------------------------------

db = SQLAlchemy(app)

@app.route('/')
def index():
    return "Hello, MockMarket Backend is Running!"

@app.route('/test_db')
def test_db_connection():
    try:
        with db.engine.connect() as connection:
            return jsonify({"status": "success", "message": "Database connected successfully!"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)