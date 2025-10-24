
import os
from dotenv import load_dotenv
from flask import Flask, jsonify
from routes.auth_routes import auth_bp
load_dotenv()
app = Flask(__name__)

# ----------------------------------------------

@app.route('/')
def index():
    return "Hello, MockMarket Backend is Running!"

app.register_blueprint(auth_bp, url_prefix='/auth')



if __name__ == '__main__':
    app.run(debug=True)

