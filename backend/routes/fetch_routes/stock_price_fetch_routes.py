# routes/stock_prices.py

from flask import Blueprint, request, jsonify
from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
from db_pool import get_connection

stock_prices_bp = Blueprint('stock_prices_bp', __name__)

@stock_prices_bp.route('/fetch-prices', methods=['GET'])
def fetch_prices():
    return fetch_all_stock_prices()


def _top_movers_query(order: str, limit: int, exchange: str | None, use_intraday: bool = True):
    """
    Query top movers (gainers/losers)
    
    Args:
        order: "DESC" for gainers, "ASC" for losers
        limit: Number of results to return
        exchange: Exchange filter (e.g., 'NSE')
        use_intraday: If True, calculates % change from day_open (intraday, matches Groww)
                      If False, calculates from prev_close (day-over-day)
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        where_exchange = ""
        params = []
        if exchange:
            where_exchange = "AND s.exchange = %s"
            params.append(exchange)

        # Choose base price for % calculation
        if use_intraday:
            # Intraday: Compare LTP vs day_open (matches Groww/Zerodha)
            base_price = "sp.day_open"
            where_clause = "WHERE sp.day_open IS NOT NULL AND sp.day_open <> 0"
        else:
            # Day-over-day: Compare LTP vs prev_close
            base_price = "sp.prev_close"
            where_clause = "WHERE sp.prev_close IS NOT NULL AND sp.prev_close <> 0"

        sql = f"""
            SELECT 
                s.stock_id,
                s.symbol,
                s.company_name,
                sp.ltp,
                sp.prev_close,
                sp.day_open,
                (sp.ltp - {base_price}) AS change_value,
                CASE WHEN {base_price} IS NOT NULL AND {base_price} <> 0 
                     THEN ((sp.ltp - {base_price}) / {base_price}) * 100
                     ELSE NULL END AS change_percent,
                sp.as_of
            FROM Stock_Prices sp
            INNER JOIN (
                SELECT stock_id, MAX(as_of) AS max_as_of
                FROM Stock_Prices
                GROUP BY stock_id
            ) latest
              ON latest.stock_id = sp.stock_id AND latest.max_as_of = sp.as_of
            INNER JOIN Stocks s ON s.stock_id = sp.stock_id
            {where_clause}
            {where_exchange}
            ORDER BY change_percent {order}, sp.ltp {order}
            LIMIT %s
        """
        params.append(limit)
        cursor.execute(sql, params)
        rows = cursor.fetchall()

        # Map to frontend-friendly structure
        movers = []
        for r in rows:
            ltp = float(r["ltp"]) if r.get("ltp") is not None else None
            pct = float(r["change_percent"]) if r.get("change_percent") is not None else None
            movers.append({
                "name": r["company_name"],
                "symbol": r["symbol"],
                "price": f"{ltp:,.2f}" if ltp is not None else None,
                "change": (f"{pct:+.2f}%" if pct is not None else None),
                # optional numeric fields
                "priceNum": ltp,
                "changePercentNum": pct,
                "changeValueNum": float(r["change_value"]) if r.get("change_value") is not None else None,
                "asOf": r["as_of"].isoformat() if r.get("as_of") else None,
            })

        return movers
    finally:
        cursor.close()
        conn.close()


@stock_prices_bp.route('/top-gainers', methods=['GET'])
def top_gainers():
    try:
        limit = int(request.args.get('limit', 10))
        exchange = request.args.get('exchange', 'NSE')
        # Use intraday mode by default (matches Groww/Zerodha)
        use_intraday = request.args.get('intraday', 'true').lower() == 'true'
        
        movers = _top_movers_query(order="DESC", limit=limit, exchange=exchange, use_intraday=use_intraday)
        return jsonify({
            "status": "success",
            "data": movers,
            "count": len(movers)
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@stock_prices_bp.route('/top-losers', methods=['GET'])
def top_losers():
    try:
        limit = int(request.args.get('limit', 10))
        exchange = request.args.get('exchange', 'NSE')
        # Use intraday mode by default (matches Groww/Zerodha)
        use_intraday = request.args.get('intraday', 'true').lower() == 'true'
        
        movers = _top_movers_query(order="ASC", limit=limit, exchange=exchange, use_intraday=use_intraday)
        return jsonify({
            "status": "success",
            "data": movers,
            "count": len(movers)
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@stock_prices_bp.route('/most-active', methods=['GET'])
def most_active():
    """
    Returns stocks with highest trading activity (using price volatility as proxy)
    Note: Since volume data is not available in Stock_Prices table,
    we use (day_high - day_low) / prev_close as a proxy for activity
    """
    try:
        limit = int(request.args.get('limit', 10))
        exchange = request.args.get('exchange', 'NSE')
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            where_exchange = ""
            params = []
            if exchange:
                where_exchange = "AND s.exchange = %s"
                params.append(exchange)
            
            sql = f"""
                SELECT 
                    s.stock_id,
                    s.symbol,
                    s.company_name,
                    sp.ltp,
                    sp.prev_close,
                    sp.day_open,
                    sp.day_high,
                    sp.day_low,
                    (sp.ltp - sp.prev_close) AS change_value,
                    CASE WHEN sp.prev_close IS NOT NULL AND sp.prev_close <> 0 
                         THEN ((sp.ltp - sp.prev_close) / sp.prev_close) * 100
                         ELSE NULL END AS change_percent,
                    CASE WHEN sp.prev_close IS NOT NULL AND sp.prev_close <> 0 
                         THEN ((sp.day_high - sp.day_low) / sp.prev_close) * 100
                         ELSE NULL END AS volatility_score,
                    sp.as_of
                FROM Stock_Prices sp
                INNER JOIN (
                    SELECT stock_id, MAX(as_of) AS max_as_of
                    FROM Stock_Prices
                    GROUP BY stock_id
                ) latest
                  ON latest.stock_id = sp.stock_id AND latest.max_as_of = sp.as_of
                INNER JOIN Stocks s ON s.stock_id = sp.stock_id
                WHERE sp.day_high IS NOT NULL 
                  AND sp.day_low IS NOT NULL 
                  AND sp.day_high > sp.day_low
                {where_exchange}
                ORDER BY volatility_score DESC, sp.ltp DESC
                LIMIT %s
            """
            params.append(limit)
            cursor.execute(sql, params)
            rows = cursor.fetchall()

            # Map to frontend-friendly structure
            active_stocks = []
            for r in rows:
                ltp = float(r["ltp"]) if r.get("ltp") is not None else None
                pct = float(r["change_percent"]) if r.get("change_percent") is not None else None
                volatility = float(r["volatility_score"]) if r.get("volatility_score") is not None else None
                
                # Use volatility percentage as a pseudo-volume indicator
                # Format it as if it were volume for display consistency
                volume_display = int(volatility * 100000) if volatility else 0
                
                active_stocks.append({
                    "name": r["company_name"],
                    "symbol": r["symbol"],
                    "price": f"{ltp:,.2f}" if ltp is not None else None,
                    "change": (f"{pct:+.2f}%" if pct is not None else None),
                    "volume": volume_display,  # Pseudo-volume based on volatility
                    # optional numeric fields
                    "priceNum": ltp,
                    "changePercentNum": pct,
                    "changeValueNum": float(r["change_value"]) if r.get("change_value") is not None else None,
                    "asOf": r["as_of"].isoformat() if r.get("as_of") else None,
                })

            return jsonify({
                "status": "success",
                "data": active_stocks,
                "count": len(active_stocks)
            }), 200
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500