from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta, date 
import os
from datetime import datetime, timedelta, time
from services.http_client import upstox_get
from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
import traceback # For logging

# --- Imports ---
from db_pool import get_connection
from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
from services.http_client import upstox_get
from services.cache_service import get_cache
from utils.market_hours import should_use_websocket
# Optional live cache for real-time movers
try:
    from services.live_price_cache import get_all_cached_prices
except Exception:
    get_all_cached_prices = None  # type: ignore
# -----------------

stock_prices_bp = Blueprint('stock_prices_bp', __name__)
cache = get_cache()

@stock_prices_bp.route('/fetch-prices', methods=['GET'])
def fetch_prices():
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

        # If during market hours and live cache available, override LTP with live values
        # and recompute change percent/value for real-time movers.
        try:
            if should_use_websocket() and get_all_cached_prices is not None:
                live_map = {}
                for e in get_all_cached_prices():
                    sid = e.get("stock_id")
                    if sid is not None:
                        live_map[sid] = {
                            "ltp": e.get("ltp"),
                            "day_open": e.get("day_open"),
                            "prev_close": e.get("prev_close"),
                        }
                # recompute metrics
                for r in rows:
                    live = live_map.get(r["stock_id"]) if isinstance(r, dict) else None
                    if not live:
                        continue
                    ltp_live = live.get("ltp")
                    if ltp_live is None:
                        continue
                    r["ltp"] = float(ltp_live)
                    # prefer base from cache if present to avoid DB-stale open/close
                    base = None
                    if use_intraday:
                        base = float(live.get("day_open") or r.get("day_open") or 0)
                    else:
                        base = float(live.get("prev_close") or r.get("prev_close") or 0)
                    if base:
                        r["change_value"] = float(r["ltp"]) - base
                        r["change_percent"] = ((float(r["ltp"]) - base) / base) * 100.0
        except Exception:
            # best-effort live override; fallback to DB-derived rows on any error
            pass

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
        
        # Cache for 3 seconds during market hours, 10 seconds otherwise
        live_mode = should_use_websocket()
        cache_key = f"gainers:{exchange}:{limit}:{use_intraday}:{live_mode}"
        movers = cache.get_or_compute_stale(
            cache_key,
            lambda: _top_movers_query(order="DESC", limit=limit, exchange=exchange, use_intraday=use_intraday),
            ttl_seconds=3 if live_mode else 10,
            stale_ttl_seconds=120
        )
        
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
        
        # Cache for 3 seconds during market hours, 10 seconds otherwise
        live_mode = should_use_websocket()
        cache_key = f"losers:{exchange}:{limit}:{use_intraday}:{live_mode}"
        movers = cache.get_or_compute_stale(
            cache_key,
            lambda: _top_movers_query(order="ASC", limit=limit, exchange=exchange, use_intraday=use_intraday),
            ttl_seconds=3 if live_mode else 10,
            stale_ttl_seconds=120
        )
        
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
    """Get detailed stock information by symbol - uses live cache during market hours."""
    conn = None
    cursor = None
    force_live = request.args.get('forceLive') == '1'
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        # Query stock info + latest price from database
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

        # Extract DB values
        ltp = float(stock['ltp']) if stock.get('ltp') is not None else None
        prev_close = float(stock['prev_close']) if stock.get('prev_close') is not None else None
        day_open = float(stock['day_open']) if stock.get('day_open') is not None else None
        day_high = float(stock['day_high']) if stock.get('day_high') is not None else None
        day_low = float(stock['day_low']) if stock.get('day_low') is not None else None
        change_pct = float(stock['change_percent']) if stock.get('change_percent') is not None else None
        change_val = float(stock['change_value']) if stock.get('change_value') is not None else None

        live_price_source = "database"
        # Live override attempts
        try:
            from services.live_price_cache import get_day_ohlc
            live_cache_data = get_day_ohlc(stock['stock_id'])
            if live_cache_data and isinstance(live_cache_data, dict):
                # live_cache_data has: open, high, low, close, prev_close, timestamp, symbol
                if live_cache_data.get("close") is not None:
                    ltp = float(live_cache_data["close"])
                    live_price_source = "websocket_cache"
                if live_cache_data.get("open") is not None:
                    day_open = float(live_cache_data["open"])
                if live_cache_data.get("prev_close") is not None:
                    prev_close = float(live_cache_data["prev_close"])
                if live_cache_data.get("high") is not None:
                    day_high = float(live_cache_data["high"])
                if live_cache_data.get("low") is not None:
                    day_low = float(live_cache_data["low"])
                if prev_close and prev_close > 0 and live_price_source == "websocket_cache":
                    change_val = ltp - prev_close
                    change_pct = ((ltp - prev_close) / prev_close) * 100.0
                print(f"✅ [get_stock_detail] Using WebSocket LIVE price for {symbol}: ₹{ltp:.2f}")
            elif should_use_websocket():
                print(f"⚠️ [get_stock_detail] WebSocket cache miss for {symbol} (stock_id={stock['stock_id']})")
            # Direct Upstox API fetch if forced and still database source
            if force_live and should_use_websocket() and live_price_source == "database":
                try:
                    from controller.order.buy_sell_order import get_live_price
                    cursor2 = conn.cursor(dictionary=True)
                    cursor2.execute("SELECT isin FROM Stocks WHERE stock_id=%s", (stock['stock_id'],))
                    row_isin = cursor2.fetchone()
                    cursor2.close()
                    if row_isin and row_isin.get('isin'):
                        direct_price = get_live_price(row_isin['isin'], stock_id=stock['stock_id'])
                        if isinstance(direct_price, (int, float)):
                            ltp = float(direct_price)
                            live_price_source = "upstox_api"
                            if prev_close and prev_close > 0:
                                change_val = ltp - prev_close
                                change_pct = ((ltp - prev_close) / prev_close) * 100.0
                            print(f"✅ [get_stock_detail] Force-live Upstox price used for {symbol}: ₹{ltp:.2f}")
                except Exception as fe:
                    print(f"⚠️ [get_stock_detail] Force-live failed for {symbol}: {fe}")
        except Exception as e:
            print(f"⚠️ [get_stock_detail] Live override failed for {symbol}: {e}")

        response = {
            "stock_id": stock['stock_id'],
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
            "priceSource": live_price_source,
            "timestamp": datetime.utcnow().isoformat() + 'Z'
        }
        return jsonify({
            "status": "success",
            "data": response
        }), 200
    except Exception as e:
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

        # Step 1: find matching stocks quickly using indexed fields only
        search_upper = query.upper()
        if len(search_upper) <= 2:
            sql1 = """
                SELECT s.stock_id, s.symbol, s.company_name, s.exchange
                FROM Stocks s
                WHERE s.symbol LIKE %s
                ORDER BY s.symbol
                LIMIT %s
            """
            cursor.execute(sql1, (f"{search_upper}%", limit))
        else:
            sql1 = """
                SELECT 
                    s.stock_id, s.symbol, s.company_name, s.exchange,
                    CASE 
                        WHEN s.symbol = %s THEN 1
                        WHEN s.symbol LIKE %s THEN 2
                        ELSE 3
                    END AS match_priority
                FROM Stocks s
                WHERE s.symbol LIKE %s OR s.company_name LIKE %s
                ORDER BY match_priority, s.symbol
                LIMIT %s
            """
            exact = search_upper
            prefix = f"{search_upper}%"
            cursor.execute(sql1, (exact, prefix, prefix, prefix, limit))

        stock_rows = cursor.fetchall()
        if not stock_rows:
            return jsonify({
                "status": "success",
                "data": [],
                "count": 0
            }), 200

        # Step 2: fetch latest prices only for matched stock_ids
        stock_ids = [row["stock_id"] for row in stock_rows]
        # Build placeholders for IN clause
        placeholders = ",".join(["%s"] * len(stock_ids))
        sql2 = f"""
            SELECT sp.stock_id, sp.ltp, sp.prev_close
            FROM Stock_Prices sp
            INNER JOIN (
                SELECT stock_id, MAX(as_of) AS max_as_of
                FROM Stock_Prices
                WHERE stock_id IN ({placeholders})
                GROUP BY stock_id
            ) latest
              ON latest.stock_id = sp.stock_id AND latest.max_as_of = sp.as_of
        """
        cursor.execute(sql2, tuple(stock_ids))
        price_rows = cursor.fetchall()
        price_map = {r["stock_id"]: r for r in price_rows}
        
        results = []
        for stock in stock_rows:
            price = price_map.get(stock['stock_id'])
            ltp = float(price['ltp']) if price and price.get('ltp') is not None else None
            change_pct = None
            if price and price.get('ltp') is not None and price.get('prev_close') not in (None, 0):
                try:
                    change_pct = ((float(price['ltp']) - float(price['prev_close'])) / float(price['prev_close'])) * 100.0
                except Exception:
                    change_pct = None
            
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
        
        # Cache for 10 seconds
        cache_key = f"active:{exchange}:{limit}"
        
        def fetch_most_active():
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

                return {
                    "status": "success",
                    "data": active_stocks,
                    "count": len(active_stocks)
                }
            finally:
                cursor.close()
                conn.close()

        result = cache.get_or_compute_stale(cache_key, fetch_most_active, ttl_seconds=10, stale_ttl_seconds=120)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@stock_prices_bp.route('/movers-all', methods=['GET'])
def movers_all():
    """
    Aggregated endpoint that returns gainers, losers, and most active in a single response.
    Reduces 3 sequential RTTs to 1, significantly improving dashboard load time.
    """
    try:
        limit = int(request.args.get('limit', 10))
        exchange = request.args.get('exchange', 'NSE')
        use_intraday = request.args.get('intraday', 'true').lower() == 'true'
        
        # Cache the aggregated result for 10 seconds
        cache_key = f"movers_all:{exchange}:{limit}:{use_intraday}"
        
        def fetch_all_movers():
            # Fetch gainers
            gainers_key = f"gainers:{exchange}:{limit}:{use_intraday}"
            gainers = cache.get_or_compute_stale(
                gainers_key,
                lambda: _top_movers_query(order="DESC", limit=limit, exchange=exchange, use_intraday=use_intraday),
                ttl_seconds=10,
                stale_ttl_seconds=120
            )
            
            # Fetch losers
            losers_key = f"losers:{exchange}:{limit}:{use_intraday}"
            losers = cache.get_or_compute_stale(
                losers_key,
                lambda: _top_movers_query(order="ASC", limit=limit, exchange=exchange, use_intraday=use_intraday),
                ttl_seconds=10,
                stale_ttl_seconds=120
            )
            
            # Fetch most active
            active_key = f"active:{exchange}:{limit}"
            
            def fetch_most_active_internal():
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

                    active_stocks = []
                    for r in rows:
                        ltp = float(r["ltp"]) if r.get("ltp") is not None else None
                        pct = float(r["change_percent"]) if r.get("change_percent") is not None else None
                        volatility = float(r["volatility_score"]) if r.get("volatility_score") is not None else None
                        volume_display = int(volatility * 100000) if volatility else 0
                        
                        active_stocks.append({
                            "name": r["company_name"],
                            "symbol": r["symbol"],
                            "price": f"{ltp:,.2f}" if ltp is not None else None,
                            "change": (f"{pct:+.2f}%" if pct is not None else None),
                            "volume": volume_display,
                            "priceNum": ltp,
                            "changePercentNum": pct,
                            "changeValueNum": float(r["change_value"]) if r.get("change_value") is not None else None,
                            "asOf": r["as_of"].isoformat() if r.get("as_of") else None,
                        })

                    return {
                        "status": "success",
                        "data": active_stocks,
                        "count": len(active_stocks)
                    }
                finally:
                    cursor.close()
                    conn.close()
            
            most_active = cache.get_or_compute_stale(active_key, fetch_most_active_internal, ttl_seconds=10, stale_ttl_seconds=120)
            
            return {
                "gainers": gainers,
                "losers": losers,
                "mostActive": most_active["data"]
            }

        result = cache.get_or_compute_stale(cache_key, fetch_all_movers, ttl_seconds=10, stale_ttl_seconds=120)

        return jsonify({
            "status": "success",
            "data": result
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@stock_prices_bp.route('/history/<string:symbol>', methods=['GET'])
def get_stock_history(symbol: str):
    """
    Return OHLCV candles for a symbol from the local database ONLY.
    """
    conn = None
    cursor = None
    try:
        interval = (request.args.get('interval') or 'day').lower()
        if interval not in ('day', 'week', 'month', 'year'):
            return jsonify({"status": "error", "message": "invalid interval; use day|week|month|year"}), 400

        # Resolve date range
        to_param = request.args.get('to')
        from_param = request.args.get('from')
        limit_param = request.args.get('limit')

        today = datetime.now().date()
        to_date = datetime.strptime(to_param, "%Y-%m-%d").date() if to_param else today

        if limit_param and limit_param.isdigit():
            n = int(limit_param)
            if n <= 0:
                n = 90
            # Reasonable defaults based on interval
            if interval == 'day':
                from_date = to_date - timedelta(days=max(n, 1) * 2)  # include weekends/holidays slack
            elif interval == 'week':
                from_date = to_date - timedelta(weeks=max(n, 1) + 2)
            elif interval == 'month':
                # approx months -> days
                from_date = to_date - timedelta(days=max(n, 1) * 31)
            else:  # year -> n years -> days
                from_date = to_date - timedelta(days=max(n, 1) * 365)
        else:
            if from_param:
                from_date = datetime.strptime(from_param, "%Y-%m-%d").date()
            else:
                # Defaults: day=6M, week=3Y, month=5Y (storage-light)
                if interval == 'day':
                    from_date = to_date - timedelta(days=180)
                elif interval == 'week':
                    from_date = to_date - timedelta(days=365*3)
                elif interval == 'month':
                    from_date = to_date - timedelta(days=365*2)
                else:  # year
                    from_date = to_date - timedelta(days=365)

        # Lookup stock_id and ISIN
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT stock_id, isin, exchange FROM Stocks WHERE symbol = %s LIMIT 1", (symbol.upper(),))
        stock = cursor.fetchone()
        print(f"🔎 Stock lookup for {symbol}: {stock}")
        if not stock:
            return jsonify({"status": "error", "message": f"symbol '{symbol}' not found"}), 404

        stock_id = stock['stock_id']
        # Ensure we have required metadata for Upstox instrument key
        isin = stock.get('isin')
        exchange = (stock.get('exchange') or 'NSE').upper()

        # Query existing daily candles in range
        print(f"🔍 Querying Stock_History: stock_id={stock_id}, from={from_date}, to={to_date}")
        cursor.execute(
            """
            SELECT timestamp, open_price, high_price, low_price, close_price, volume
            FROM Stock_History
            WHERE stock_id = %s AND timeframe = 'day' AND timestamp BETWEEN %s AND %s
            ORDER BY timestamp ASC
            """,
            (stock_id, from_date, to_date)
        )
        existing = cursor.fetchall()
        print(f"📊 Query returned {len(existing)} candles for {symbol}")
        if existing and len(existing) > 0:
            print(f"   First candle: {existing[0]['timestamp']}, Last candle: {existing[-1]['timestamp']}")

        have_enough = len(existing) >= 5  # heuristics: if we have some data, we can serve; will still try to backfill if stale
        print(f"💾 have_enough = {have_enough} (need at least 5, got {len(existing)})")

        # Decide if we need to fetch from Upstox (when empty or last day missing)
        need_fetch = True
        if existing:
            last_ts = existing[-1]['timestamp']
            # Fix: Convert to_date to datetime for comparison (end of day)
            to_date_dt = datetime.combine(to_date, time(23, 59, 59, 999999))
            need_fetch = last_ts < to_date_dt
            print(f"📅 Last candle date: {last_ts}, to_date: {to_date}, need_fetch: {need_fetch}")
        else:
            print(f"❗ No existing candles found, need_fetch: {need_fetch}")

        # Option to skip external fetch via query param for responsiveness
        skip_fetch = (request.args.get('skip_fetch') or request.args.get('db_only') or 'false').lower() == 'true'
        if need_fetch and not skip_fetch:
            token = os.environ.get("UPSTOX_ACCESS_TOKEN")
            print(f"🔑 UPSTOX_ACCESS_TOKEN: {'SET' if token else 'NOT SET'}")
            if not token:
                # Can't fetch; if we have some cached data, proceed; else return empty ONLY if truly no data
                if not existing:
                    print(f"⛔ Returning empty data: no token AND no cached data (have {len(existing)})")
                    return jsonify({
                        "status": "success",
                        "symbol": symbol.upper(),
                        "interval": interval,
                        "count": 0,
                        "data": []
                    }), 200
                else:
                    print(f"✅ No token but have cached data ({len(existing)} candles), proceeding...")
            else:
                # Fetch from Upstox Historical Candle API (daily)
                if not isin:
                    print(f"⛔ No ISIN for {symbol}, cannot fetch from Upstox")
                    # Return what we have (possibly empty)
                    return jsonify({
                        "status": "success",
                        "symbol": symbol.upper(),
                        "interval": interval,
                        "count": len(existing),
                        "data": [] if not existing else [
                            {
                                "time": r["timestamp"].strftime("%Y-%m-%d"),
                                "open": float(r["open_price"]),
                                "high": float(r["high_price"]),
                                "low": float(r["low_price"]),
                                "close": float(r["close_price"]),
                                "volume": int(r["volume"]) if r.get("volume") is not None else 0,
                            } for r in existing
                        ],
                    }), 200

                instrument_key = f"{exchange}_EQ|{isin}"
                # Upstox expects from_date before to_date
                # Ensure to_date doesn't exceed today (Upstox rejects future dates)
                actual_to_date = min(to_date, datetime.now().date())
                url = f"https://api.upstox.com/v2/historical-candle/{instrument_key}/day/{from_date:%Y-%m-%d}/{actual_to_date:%Y-%m-%d}"
                headers = {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": f"Bearer {token}",
                }
                # Keep this call snappy to avoid frontend timeouts.
                # Use a short timeout and no retries; fallback will serve cached or empty data.
                try:
                    resp = upstox_get(url, headers=headers, timeout=5, max_retries=1)
                    resp.raise_for_status()
                    payload = resp.json() or {}
                    if payload.get("status") != "success":
                        # Fall back gracefully - continue to use existing data
                        print(f"⚠️ Upstox API returned non-success status, using cached data")
                    else:
                        candles = payload.get("data", {}).get("candles", []) or []
                        # Upsert into Stock_History
                        if candles:
                            insert_rows = []
                            for row in candles:
                                # row = [ts, open, high, low, close, volume, oi]
                                ts_iso = row[0]
                                try:
                                    ts_date = datetime.fromisoformat(ts_iso.replace("Z", "+00:00")).date()
                                except Exception:
                                    # Fallback: take date part
                                    ts_date = datetime.strptime(ts_iso[:10], "%Y-%m-%d").date()
                                o, h, l, c = float(row[1] or 0), float(row[2] or 0), float(row[3] or 0), float(row[4] or 0)
                                v = int(row[5] or 0)
                                insert_rows.append((stock_id, 'day', ts_date, o, h, l, c, v))

                            if insert_rows:
                                # Ensure table has a unique key on (stock_id, timeframe, timestamp) for proper upsert
                                cursor.executemany(
                                    """
                                    INSERT INTO Stock_History (stock_id, timeframe, timestamp, open_price, high_price, low_price, close_price, volume)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                    ON DUPLICATE KEY UPDATE
                                      open_price=VALUES(open_price),
                                      high_price=VALUES(high_price),
                                      low_price=VALUES(low_price),
                                      close_price=VALUES(close_price),
                                      volume=VALUES(volume)
                                    """,
                                    insert_rows
                                )
                                conn.commit()
                                print(f"✅ Inserted/updated {len(insert_rows)} candles from Upstox")
                                
                                # Refresh existing after successful insert
                                cursor.execute(
                                    """
                                    SELECT timestamp, open_price, high_price, low_price, close_price, volume
                                    FROM Stock_History
                                    WHERE stock_id = %s AND timeframe = 'day' AND timestamp BETWEEN %s AND %s
                                    ORDER BY timestamp ASC
                                    """,
                                    (stock_id, from_date, to_date)
                                )
                                existing = cursor.fetchall()
                                print(f"🔄 Refreshed data: now have {len(existing)} candles")
                except Exception as e:
                    # If Upstox fetch fails (timeout, network error, etc.), just use cached data
                    error_msg = str(e)
                    # Common issues: 400 = invalid date range/instrument, 429 = rate limit, timeout = network
                    if "400" in error_msg:
                        print(f"⚠️ Upstox rejected request for {symbol} (HTTP 400: likely invalid date range or delisted stock), using cached data")
                    elif "429" in error_msg:
                        print(f"⚠️ Upstox rate limit hit for {symbol}, using cached data")
                    elif "timeout" in error_msg.lower():
                        print(f"⚠️ Upstox request timeout for {symbol}, using cached data")
                    else:
                        # Don't print full URL to avoid confusion - just the error type
                        error_type = type(e).__name__
                        print(f"⚠️ Failed to fetch from Upstox for {symbol} ({error_type}), using cached data")
                    print(f"💾 Falling back to {len(existing)} candles from DB")
                    pass  # Continue to use existing data from DB

        # Aggregate if needed
        def rows_to_series(rows):
            return [
                {
                    "time": r["timestamp"].strftime("%Y-%m-%d"),
                    "open": float(r["open_price"]),
                    "high": float(r["high_price"]),
                    "low": float(r["low_price"]),
                    "close": float(r["close_price"]),
                    "volume": int(r["volume"]) if r.get("volume") is not None else 0,
                }
                for r in rows
            ]

        if not existing:
            # If 'existing' is empty, return empty
            print(f"⛔ No data found in DB for {symbol} in this range.")
            return jsonify({
                "status": "success",
                "symbol": symbol.upper(),
                "interval": interval,
                "count": 0,
                "data": [],
            }), 200

        # --- This code will now be reached immediately ---
        if interval == 'day':
            data = rows_to_series(existing)
        else:
            # Aggregate to week or month from daily rows
            buckets = {}
            for r in existing:
                d: datetime = r['timestamp']
                if interval == 'week':
                    key = f"{d.isocalendar().year}-W{d.isocalendar().week:02d}"
                    key_date = d - timedelta(days=d.weekday())
                else: 
                    key = f"{d.year}-{d.month:02d}"
                    key_date = d.replace(day=1)

                b = buckets.get(key)
                o, h, l, c = float(r['open_price']), float(r['high_price']), float(r['low_price']), float(r['close_price'])
                v = int(r['volume'] or 0)
                if not b:
                    buckets[key] = {
                        'time': key_date.strftime('%Y-%m-%d'),
                        'open': o,
                        'high': h,
                        'low': l,
                        'close': c,
                        'volume': v,
                        '_first_ts': d,
                        '_last_ts': d,
                    }
                else:
                    b['high'] = max(b['high'], h)
                    b['low'] = min(b['low'], l)
                    if d < b['_first_ts']:
                        b['open'] = o
                        b['_first_ts'] = d
                    if d > b['_last_ts']:
                        b['close'] = c
                        b['_last_ts'] = d
                    b['volume'] += v

            data = [
                {k: v for k, v in b.items() if not k.startswith('_')}
                for _, b in sorted(buckets.items(), key=lambda kv: kv[1]['_first_ts'])
            ]
            if interval == 'year' and data:
                data = data[-12:]

        return jsonify({
            "status": "success",
            "symbol": symbol.upper(),
            "interval": interval,
            "count": len(data),
            "data": data,
        }), 200

    except Exception as e:
        # This is the CATCH-ALL for unexpected errors (e.g., DB connection)
        print(f"❌ CRITICAL ERROR in get_stock_history for {symbol}: {str(e)}")
        print(traceback.format_exc())
        
        # Graceful empty response on unexpected errors for better UX
        return jsonify({
            "status": "success",
            "symbol": symbol.upper(),
            "interval": (request.args.get('interval') or 'day').lower(),
            "count": 0,
            "data": []
        }), 200
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()