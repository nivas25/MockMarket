from flask import Blueprint, jsonify
from db_pool import get_connection
from controller.fetch.index_fetch.fetch_indices import update_index_prices
from utils.market_hours import should_use_websocket, get_market_status
from services.index_websocket import get_live_cache
from services.cache_service import get_cache

index_fetch_bp = Blueprint("index_fetch", __name__)
cache = get_cache()


@index_fetch_bp.route("/all", methods=["GET"])
def get_all_indices():
    """
    Get all indices
    - During market hours (9:13 AM - 3:30 PM): Returns live data from WebSocket cache
    - Outside market hours: Returns closing prices from database
    """
    # Check market status
    use_websocket = should_use_websocket()
    
    if use_websocket:
        # Return live data from WebSocket cache
        live_data = get_live_cache()
        
        if live_data:
            # Group by tag
            grouped_indices = {}
            for index_name, data in live_data.items():
                tag = data["tag"]
                if tag not in grouped_indices:
                    grouped_indices[tag] = []
                
                grouped_indices[tag].append({
                    "name": data["name"],
                    "value": f"{data['ltp']:,.2f}",
                    "open": f"{data['open']:,.2f}",
                    "high": f"{data['high']:,.2f}",
                    "low": f"{data['low']:,.2f}",
                    "prev_close": f"{data['prev_close']:,.2f}",
                    "change": f"{data['change_value']:+.2f}",
                    "change_percent": f"{data['change_percent']:+.2f}",
                    "direction": "up" if data['change_value'] > 0 else "down" if data['change_value'] < 0 else "neutral",
                    "last_updated": data["last_updated"]
                })
            
            return jsonify({
                "status": "success",
                "source": "live_websocket",
                "market_status": "open",
                "data": grouped_indices
            }), 200
        else:
            # WebSocket cache empty - fall back to DB
            pass
    
    # Fall back to database (market closed or no live data)
    # Cache for 5 seconds during market hours, 60 seconds outside market hours
    cache_ttl = 5 if use_websocket else 60
    cache_key = f"indices_all:{use_websocket}"
    
    def fetch_indices_from_db():
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
                # Deduplicate by taking the most recent row per index_name
                sql = """
                    SELECT ip.index_name, ip.ltp, ip.open_price, ip.high_price, ip.low_price,
                           ip.prev_close, ip.change_value, ip.change_percent, ip.tag, ip.last_updated
                    FROM Index_Prices ip
                    INNER JOIN (
                        SELECT index_name, MAX(last_updated) AS max_updated
                        FROM Index_Prices
                        GROUP BY index_name
                    ) latest
                    ON ip.index_name = latest.index_name AND ip.last_updated = latest.max_updated
                    ORDER BY 
                        CASE ip.tag
                            WHEN 'Benchmark' THEN 1
                            WHEN 'Banking' THEN 2
                            WHEN 'Volatility' THEN 3
                            WHEN 'Sectoral' THEN 4
                            WHEN 'Broader Market' THEN 5
                            ELSE 6
                        END,
                        ip.index_name
                """

                cursor.execute(sql)
                results = cursor.fetchall()
                
                if not results:
                    return {
                        "status": "error",
                        "message": "No index data available. Please ensure the fetcher is running."
                    }
                
                # Format response grouped by tag
                grouped_indices = {}
                
                for row in results:
                    tag = row["tag"]
                    if tag not in grouped_indices:
                        grouped_indices[tag] = []
                    
                    grouped_indices[tag].append({
                        "name": row["index_name"],
                        "value": f"{float(row['ltp']):,.2f}",
                        "open": f"{float(row['open_price']):,.2f}" if row['open_price'] else None,
                        "high": f"{float(row['high_price']):,.2f}" if row['high_price'] else None,
                        "low": f"{float(row['low_price']):,.2f}" if row['low_price'] else None,
                        "prevClose": f"{float(row['prev_close']):,.2f}" if row['prev_close'] else None,
                        "change": f"{float(row['change_percent']):+.2f}%",
                        "changeValue": f"{float(row['change_value']):+,.2f}" if row['change_value'] else None,
                        "direction": "up" if float(row["change_percent"]) >= 0 else "down",
                        "tag": tag,
                        "lastUpdated": row["last_updated"].isoformat() if row["last_updated"] else None
                    })
                
                market_status = get_market_status()
                
                return {
                    "status": "success",
                    "source": "database",
                    "market_status": "closed" if not use_websocket else "open",
                    "message": market_status["message"],
                    "data": grouped_indices,
                    "totalIndices": len(results)
                }
            
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }
        finally:
            cursor.close()
            conn.close()
    
    try:
        result = cache.get_or_compute(cache_key, fetch_indices_from_db, ttl_seconds=cache_ttl)
        
        if result.get("status") == "error":
            return jsonify(result), 404 if "No index data" in result.get("message", "") else 500
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@index_fetch_bp.route("/market-status", methods=["GET"])
def get_market_status_route():
    """Get current market status and timing info"""
    try:
        status = get_market_status()
        return jsonify({
            "status": "success",
            "data": status
        }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@index_fetch_bp.route("/refresh", methods=["POST", "GET"])
def refresh_indices_now():
    """
    Manually trigger index price update
    During market hours: saves live cache to DB
    Outside market hours: fetches from Upstox API
    """
    try:
        # During market hours, save live cache to DB
        if should_use_websocket():
            from services.index_websocket import save_closing_prices
            save_closing_prices()
            return jsonify({
                "status": "success",
                "message": "Saved live data to database",
                "source": "websocket_cache"
            }), 200
        else:
            # Outside market hours, fetch from Upstox and save
            updated = update_index_prices()
            return jsonify({
                "status": "success",
                "updated": updated,
                "source": "upstox_api"
            }), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500


@index_fetch_bp.route("/<string:index_name>", methods=["GET"])
def get_index_by_name(index_name):
    """Get specific index details by name"""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        sql = """
            SELECT 
                index_name,
                ltp,
                open_price,
                high_price,
                low_price,
                prev_close,
                change_value,
                change_percent,
                tag,
                last_updated
            FROM Index_Prices
            WHERE index_name = %s
        """
        
        cursor.execute(sql, (index_name,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({
                "status": "error",
                "message": f"Index '{index_name}' not found"
            }), 404
        
        # Format response
        index_data = {
            "name": result["index_name"],
            "value": f"{float(result['ltp']):,.2f}",
            "open": f"{float(result['open_price']):,.2f}" if result['open_price'] else None,
            "high": f"{float(result['high_price']):,.2f}" if result['high_price'] else None,
            "low": f"{float(result['low_price']):,.2f}" if result['low_price'] else None,
            "prevClose": f"{float(result['prev_close']):,.2f}" if result['prev_close'] else None,
            "change": f"{float(result['change_percent']):+.2f}%",
            "changeValue": f"{float(result['change_value']):+,.2f}" if result['change_value'] else None,
            "direction": "up" if float(result["change_percent"]) >= 0 else "down",
            "tag": result["tag"],
            "lastUpdated": result["last_updated"].isoformat() if result["last_updated"] else None
        }
        
        return jsonify({
            "status": "success",
            "data": index_data
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()