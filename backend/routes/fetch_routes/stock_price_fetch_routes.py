# routes/stock_prices.py

from flask import Blueprint
from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices

stock_prices_bp = Blueprint('stock_prices_bp', __name__)

@stock_prices_bp.route('/fetch-prices', methods=['GET'])
def fetch_prices():
    # Trigger the full fetch process
    return fetch_all_stock_prices()