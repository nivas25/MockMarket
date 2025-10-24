import os
from dotenv import load_dotenv
from flask import Flask, jsonify

load_dotenv()
app = Flask(__name__)

# ----------------------------------------------

@app.route('/')
def index():
    return "Hello, MockMarket Backend is Running!"


if __name__ == '__main__':
    app.run(debug=True)
