from flask import Blueprint, jsonify
from db_pool import get_connection
from controller.fetch.index_fetch.fetch_indices import update_index_prices

index_fetch_bp = Blueprint("index_fetch", __name__)


@index_fetch_bp.route("/all", methods=["GET"])
def get_all_indices():
    """Get all indices for 'View All' page"""
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
            return jsonify({
                "status": "error",
                "message": "No index data available. Please ensure the fetcher is running."
            }), 404
        
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
        
        return jsonify({
            "status": "success",
            "data": grouped_indices,
            "totalIndices": len(results)
        }), 200
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()


@index_fetch_bp.route("/refresh", methods=["POST", "GET"])
def refresh_indices_now():
    """Trigger a one-time refresh from the provider and return the update count.
    Useful in development or when the fetcher isn't running.
    """
    try:
        updated = update_index_prices()
        return jsonify({
            "status": "success",
            "updated": updated
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