# We will import the 'db' object from our app
from ..app import db 
from sqlalchemy.sql import func

# This model represents our local catalog of tradable stocks
class Stock(db.Model):
    __tablename__ = 'stocks'

    stock_id = db.Column(db.Integer, primary_key=True)
    instrument_key = db.Column(db.String(255), unique=True, nullable=False)
    trading_symbol = db.Column(db.String(100), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    exchange = db.Column(db.String(50), nullable=False)
    
    # Relationship to its live price
    price_info = db.relationship('StockPrice', backref='stock', uselist=False, lazy=True)

    def __repr__(self):
        return f'<Stock {self.trading_symbol}>'


# This model stores the live, frequently-updated market data for each stock
class StockPrice(db.Model):
    __tablename__ = 'stock_prices'

    price_id = db.Column(db.Integer, primary_key=True)
    stock_id = db.Column(db.Integer, db.ForeignKey('stocks.stock_id'), unique=True, nullable=False)
    
    ltp = db.Column(db.Numeric(18, 2), nullable=False, default=0.00) # Last Traded Price
    day_open = db.Column(db.Numeric(18, 2), nullable=True)
    day_high = db.Column(db.Numeric(18, 2), nullable=True)
    day_low = db.Column(db.Numeric(18, 2), nullable=True)
    day_close = db.Column(db.Numeric(18, 2), nullable=True)
    last_trade_time = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    def __repr__(self):
        return f'<StockPrice for {self.stock_id} - LTP: {self.ltp}>'