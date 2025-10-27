from flask import Blueprint, jsonify
from db_pool import get_connection
from controller.fetch.index_fetch.fetch_indices import update_index_prices

index_fetch_bp = Blueprint("index_fetch", __name__)


@index_fetch_bp.route("/top4", methods=["GET"])
def get_top4_indices():
    """Get top 4 indices for dashboard strip.
    Behavior:
    - Query DB for the four key indices in order.
    - If empty OR any missing OR data is stale (>90s), trigger a background refresh once and re-query.
    - If still empty after refresh, return a graceful fallback so the UI stays responsive.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)

    def query_top4():
        top_indices = ["NIFTY 50", "SENSEX", "BANKNIFTY", "INDIA VIX"]
        # Select only the most recent row per index_name to avoid duplicates
        sql = """
            SELECT ip.index_name, ip.ltp, ip.change_value, ip.change_percent, ip.prev_close, ip.tag, ip.last_updated
            FROM Index_Prices ip
            INNER JOIN (
                SELECT index_name, MAX(last_updated) AS max_updated
                FROM Index_Prices
                WHERE index_name IN (%s, %s, %s, %s)
                GROUP BY index_name
            ) latest
            ON ip.index_name = latest.index_name AND ip.last_updated = latest.max_updated
            ORDER BY FIELD(ip.index_name, %s, %s, %s, %s)
        """
        cursor.execute(sql, top_indices + top_indices)
        return cursor.fetchall()

    try:
        # First attempt
        results = query_top4()

        # Check for missing symbols or stale data (>90s old)
        needs_refresh = False
        wanted = set(["NIFTY 50", "SENSEX", "BANKNIFTY", "INDIA VIX"])
        present = set([r["index_name"] for r in results])
        if present != wanted:
            needs_refresh = True
        else:
            try:
                # If all present, check staleness
                latest = max([r["last_updated"] for r in results if r.get("last_updated")])
                from datetime import datetime, timezone
                now = datetime.now(tz=latest.tzinfo if latest and getattr(latest, 'tzinfo', None) else None)
                # Treat naive datetimes as local and compare in seconds
                age_seconds = (now - latest).total_seconds() if latest else 9999
                if age_seconds > 90:
                    needs_refresh = True
            except Exception:
                # On any error computing staleness, err on refreshing once
                needs_refresh = True

        # If empty, try to update once and re-query (helps first-time startup)
        if not results or needs_refresh:
            try:
                update_index_prices()
                results = query_top4()
            except Exception:
                # Ignore fetch errors here; we'll fallback below
                pass

        # If still empty, return graceful fallback so frontend doesn't error
        if not results:
            fallback = [
                {"name": "NIFTY 50", "value": "18,542.10", "change": "+0.80%", "direction": "up", "tag": "Benchmark"},
                {"name": "SENSEX", "value": "62,180.50", "change": "+0.91%", "direction": "up", "tag": "Benchmark"},
                {"name": "BANKNIFTY", "value": "43,989.15", "change": "-0.12%", "direction": "down", "tag": "Banking"},
                {"name": "INDIA VIX", "value": "12.30", "change": "+1.50%", "direction": "up", "tag": "Volatility"},
            ]
            return jsonify({
                "status": "success",
                "data": fallback,
                "count": 4,
                "source": "fallback"
            }), 200

        # Format response for frontend
        indices = []
        for row in results:
            # Prepare numeric values for clients that want finer control
            ltp_num = float(row['ltp']) if row['ltp'] is not None else None
            prev_close = float(row['prev_close']) if row.get('prev_close') is not None else None
            chg_val_num = float(row['change_value']) if row['change_value'] is not None else None
            chg_pct_num = None

            # Prefer stored DB percent if present and non-null
            if row.get('change_percent') is not None:
                try:
                    chg_pct_num = float(row['change_percent'])
                except Exception:
                    chg_pct_num = None

            # If DB percent is missing or zero-ish, compute from ltp/prev_close where possible
            if (chg_pct_num is None or chg_pct_num == 0) and ltp_num is not None and prev_close not in (None, 0):
                try:
                    computed_val = ltp_num - prev_close
                    computed_pct = (computed_val / prev_close) * 100
                    # Use computed pct only when it yields a meaningful non-zero value
                    if abs(computed_pct) > 1e-9:
                        chg_pct_num = computed_pct
                        # prefer computed change value if original missing
                        if chg_val_num is None:
                            chg_val_num = computed_val
                except Exception:
                    pass

            indices.append({
                "name": row["index_name"],
                "value": f"{ltp_num:,.2f}" if ltp_num is not None else None,
                "change": f"{chg_pct_num:+.2f}%" if chg_pct_num is not None else None,
                "direction": "up" if (chg_pct_num is not None and chg_pct_num >= 0) else "down",
                "tag": row["tag"],
                "lastUpdated": row["last_updated"].isoformat() if row["last_updated"] else None,
                # New numeric fields for better frontend formatting
                "valueNum": ltp_num,
                "changePercentNum": chg_pct_num,
                "changeValueNum": chg_val_num,
            })

        return jsonify({
            "status": "success",
            "data": indices,
            "count": len(indices),
            "source": "database"
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500
    finally:
        cursor.close()
        conn.close()


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