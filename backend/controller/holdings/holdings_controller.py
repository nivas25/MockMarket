from flask import jsonify
from db_pool import get_connection
from services.live_price_cache import get_day_ohlc
from utils.market_hours import is_market_open
import logging

logger = logging.getLogger(__name__)

def get_holdings(user_id):
    try:
        if not user_id:
            return jsonify({"error":"User Id is Required !"}),400
        
        conn = get_connection()
        cursor = conn.cursor(dictionary = True)
        logger.info(f"Fetching holdings for user_id={user_id}")
        cursor.callproc("get_user_holdings_with_balance", [user_id])
        
        for result in cursor.stored_results():
            holdings=result.fetchall()
        
        # During market hours, override with live prices
        market_open = is_market_open()
        if market_open and holdings:
            logger.info(f"Market is open - fetching live prices for {len(holdings)} holdings")
            for holding in holdings:
                stock_id = holding.get('stock_id')
                if stock_id:
                    # Try to get live price from cache
                    live_data = get_day_ohlc(stock_id)
                    if live_data and isinstance(live_data, dict):
                        old_price = holding.get('current_price', 0)
                        live_price = live_data.get('close', old_price)  # LTP
                        day_open = live_data.get('open', old_price)
                        prev_close = live_data.get('prev_close', old_price)
                        day_high = live_data.get('high', live_price)
                        day_low = live_data.get('low', live_price)
                        
                        # Update current price with live price
                        holding['current_price'] = live_price
                        holding['price_source'] = 'live'
                        
                        # Calculate 1D change (intraday) - change from previous close
                        if prev_close and prev_close > 0:
                            day_change = live_price - prev_close
                            day_change_percentage = (day_change / prev_close) * 100
                            holding['day_change'] = round(day_change, 2)
                            holding['day_change_percentage'] = round(day_change_percentage, 2)
                        else:
                            holding['day_change'] = 0.0
                            holding['day_change_percentage'] = 0.0
                        
                        # Add OHLC data for reference
                        holding['day_high'] = day_high
                        holding['day_low'] = day_low
                        holding['day_open'] = day_open
                        holding['prev_close'] = prev_close
                        
                        # Recalculate returns with live price
                        avg_price = holding.get('average_price', 0)
                        quantity = holding.get('quantity', 0)
                        
                        if avg_price > 0 and quantity > 0:
                            invested_value = avg_price * quantity
                            current_value = live_price * quantity
                            returns = current_value - invested_value
                            returns_percentage = (returns / invested_value) * 100
                            
                            holding['returns'] = round(returns, 2)
                            holding['returns_percentage'] = round(returns_percentage, 2)
                            holding['current_value'] = round(current_value, 2)
                            
                            logger.debug(f"Updated {holding.get('symbol')}: DB={old_price}, Live={live_price}, DayChg={day_change:+.2f} ({day_change_percentage:+.2f}%), Returns={returns:.2f}")
                    else:
                        holding['price_source'] = 'database'
                        holding['day_change'] = 0.0
                        holding['day_change_percentage'] = 0.0
                else:
                    holding['price_source'] = 'database'
                    holding['day_change'] = 0.0
                    holding['day_change_percentage'] = 0.0
        else:
            # Market closed - prices from DB are fine, but ensure day_change fields exist
            if holdings:
                for holding in holdings:
                    holding['price_source'] = 'database'
                    # Set default day_change if not provided by stored procedure
                    if 'day_change' not in holding:
                        holding['day_change'] = 0.0
                    if 'day_change_percentage' not in holding:
                        holding['day_change_percentage'] = 0.0
            
        cursor.close()
        conn.close()
        
        return jsonify({
            "status":"success",
            "holdings":holdings,
            "market_open": market_open
        }),200
        
    except Exception as e:
        logger.error(f"Error fetching holdings for user_id={user_id}: {e}")
        return jsonify({"error":str(e)}),500
    
    finally:
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        except Exception as e:
            logger.debug(f"Cleanup error: {e}")