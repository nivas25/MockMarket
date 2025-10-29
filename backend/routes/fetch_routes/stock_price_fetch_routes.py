# routes/stock_prices.py

from flask import Blueprint, request, jsonify
from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
from db_pool import get_connection

stock_prices_bp = Blueprint('stock_prices_bp', __name__)

@stock_prices_bp.route('/fetch-prices', methods=['GET'])
def fetch_prices():
    try:
        fetch_all_stock_prices()
        return jsonify({
            "success": True,
            "message": "Stock prices fetched and stored successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
    # Dev endpoint: trigger a one-time full fetch and return a simple status
    try:
        fetch_all_stock_prices()
        return jsonify({"status": "success", "message": "Stock prices fetch completed"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


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


@stock_prices_bp.route('/detail/<string:symbol>', methods=['GET'])
def get_stock_detail(symbol):
    """Get detailed stock information by symbol"""
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Query stock info + latest price
        sql = """
            SELECT 
                s.stock_id,
                s.symbol,
                s.company_name,
                s.exchange,
                sp.ltp,
                sp.day_open,
                sp.day_high,
                sp.day_low,
                sp.prev_close,
                sp.as_of,
                ((sp.ltp - sp.prev_close) / NULLIF(sp.prev_close, 0)) * 100 AS change_percent,
                (sp.ltp - sp.prev_close) AS change_value
            FROM Stocks s
            LEFT JOIN (
                SELECT stock_id, MAX(as_of) AS max_as_of
                FROM Stock_Prices
                GROUP BY stock_id
            ) latest ON latest.stock_id = s.stock_id
            LEFT JOIN Stock_Prices sp ON sp.stock_id = s.stock_id AND sp.as_of = latest.max_as_of
            WHERE s.symbol = %s
            LIMIT 1
        """
        
        cursor.execute(sql, (symbol.upper(),))
        stock = cursor.fetchone()
        
        if not stock:
            return jsonify({
                "status": "error",
                "message": f"Stock '{symbol}' not found in database"
            }), 404
        
        # Format response - handle None values safely
        ltp = float(stock['ltp']) if stock.get('ltp') is not None else None
        prev_close = float(stock['prev_close']) if stock.get('prev_close') is not None else None
        day_open = float(stock['day_open']) if stock.get('day_open') is not None else None
        day_high = float(stock['day_high']) if stock.get('day_high') is not None else None
        day_low = float(stock['day_low']) if stock.get('day_low') is not None else None
        change_pct = float(stock['change_percent']) if stock.get('change_percent') is not None else None
        change_val = float(stock['change_value']) if stock.get('change_value') is not None else None
        
        response = {
            "symbol": stock['symbol'],
            "companyName": stock['company_name'],
            "exchange": stock['exchange'],
            "currentPrice": ltp,
            "previousClose": prev_close,
            "dayOpen": day_open,
            "dayHigh": day_high,
            "dayLow": day_low,
            "changePercent": change_pct,
            "changeValue": change_val,
            "asOf": stock['as_of'].isoformat() if stock.get('as_of') else None,
        }
        
        return jsonify({
            "status": "success",
            "data": response
        }), 200
        
    except Exception as e:
        import traceback
        print(f"ERROR in get_stock_detail for '{symbol}':")
        print(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": str(e),
            "detail": traceback.format_exc() if __debug__ else None
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@stock_prices_bp.route('/search', methods=['GET'])
def search_stocks():
    """Search stocks by symbol or company name"""
    conn = None
    cursor = None
    try:
        query = request.args.get('q', '').strip()
        limit = int(request.args.get('limit', 10))
        
        if not query:
            return jsonify({
                "status": "success",
                "data": [],
                "count": 0
            }), 200
        
        if limit > 50:
            limit = 50  # Max 50 results
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Optimize search with indexed prefix matching
        search_upper = query.upper()
        
        # For short queries (1-2 chars), only search by symbol prefix (fastest)
        # For longer queries, search both symbol and company name
        if len(search_upper) <= 2:
            sql = """
                SELECT 
                    s.stock_id,
                    s.symbol,
                    s.company_name,
                    s.exchange,
                    sp.ltp,
                    sp.prev_close,
                    ((sp.ltp - sp.prev_close) / NULLIF(sp.prev_close, 0)) * 100 AS change_percent
                FROM Stocks s
                LEFT JOIN (
                    SELECT stock_id, MAX(as_of) AS max_as_of
                    FROM Stock_Prices
                    GROUP BY stock_id
                ) latest ON latest.stock_id = s.stock_id
                LEFT JOIN Stock_Prices sp ON sp.stock_id = s.stock_id AND sp.as_of = latest.max_as_of
                WHERE s.symbol LIKE %s
                ORDER BY s.symbol
                LIMIT %s
            """
            cursor.execute(sql, (f"{search_upper}%", limit))
        else:
            # Longer queries - search both fields but prioritize symbol matches
            sql = """
                SELECT 
                    s.stock_id,
                    s.symbol,
                    s.company_name,
                    s.exchange,
                    sp.ltp,
                    sp.prev_close,
                    ((sp.ltp - sp.prev_close) / NULLIF(sp.prev_close, 0)) * 100 AS change_percent,
                    CASE 
                        WHEN s.symbol LIKE %s THEN 1
                        WHEN s.symbol LIKE %s THEN 2
                        ELSE 3
                    END AS match_priority
                FROM Stocks s
                LEFT JOIN (
                    SELECT stock_id, MAX(as_of) AS max_as_of
                    FROM Stock_Prices
                    GROUP BY stock_id
                ) latest ON latest.stock_id = s.stock_id
                LEFT JOIN Stock_Prices sp ON sp.stock_id = s.stock_id AND sp.as_of = latest.max_as_of
                WHERE s.symbol LIKE %s OR s.company_name LIKE %s
                ORDER BY match_priority, s.symbol
                LIMIT %s
            """
            exact_match = f"{search_upper}%"
            contains_match = f"%{search_upper}%"
            cursor.execute(sql, (search_upper, exact_match, exact_match, contains_match, limit))
        
        stocks = cursor.fetchall()
        
        results = []
        for stock in stocks:
            ltp = float(stock['ltp']) if stock.get('ltp') is not None else None
            change_pct = float(stock['change_percent']) if stock.get('change_percent') is not None else None
            
            results.append({
                "symbol": stock['symbol'],
                "companyName": stock['company_name'],
                "exchange": stock['exchange'],
                "currentPrice": ltp,
                "changePercent": change_pct
            })
        
        return jsonify({
            "status": "success",
            "data": results,
            "count": len(results)
        }), 200
        
    except Exception as e:
        import traceback
        print(f"ERROR in search_stocks:")
        print(traceback.format_exc())
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


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