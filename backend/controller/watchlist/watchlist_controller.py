"""
Watchlist Controller
Handles adding stocks to user's watchlist and checking if stock is in watchlist
"""
from flask import jsonify
from db_pool import get_connection
from utils.pretty_log import status_ok, status_err, status_warn


def add_stock_to_watchlist(user_id, stock_id):
    """
    Add a stock to user's default watchlist
    Creates watchlist if it doesn't exist
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Check if user has a default watchlist
        cursor.execute(
            "SELECT watchlist_id FROM Watchlist WHERE user_id = %s LIMIT 1",
            (user_id,)
        )
        watchlist = cursor.fetchone()
        
        if not watchlist:
            # Create default watchlist for user
            cursor.execute(
                "INSERT INTO Watchlist (user_id, name) VALUES (%s, %s)",
                (user_id, "My Watchlist")
            )
            conn.commit()
            watchlist_id = cursor.lastrowid
            status_ok(f"Created default watchlist for user {user_id}")
        else:
            watchlist_id = watchlist['watchlist_id']
        
        # Check if stock already in watchlist
        cursor.execute(
            "SELECT id FROM Watchlist_Stocks WHERE watchlist_id = %s AND stock_id = %s",
            (watchlist_id, stock_id)
        )
        existing = cursor.fetchone()
        
        if existing:
            return jsonify({
                "success": False,
                "message": "Stock already in watchlist"
            }), 400
        
        # Add stock to watchlist
        cursor.execute(
            "INSERT INTO Watchlist_Stocks (watchlist_id, stock_id) VALUES (%s, %s)",
            (watchlist_id, stock_id)
        )
        conn.commit()
        
        status_ok(f"✅ Successfully added stock_id={stock_id} to watchlist_id={watchlist_id} for user_id={user_id}")
        
        # Verify it was inserted
        cursor.execute(
            "SELECT COUNT(*) as count FROM Watchlist_Stocks WHERE watchlist_id = %s AND stock_id = %s",
            (watchlist_id, stock_id)
        )
        verify = cursor.fetchone()
        status_ok(f"📊 Database verification: {verify['count']} row(s) found")
        
        return jsonify({
            "success": True,
            "message": "Stock added to watchlist",
            "watchlist_id": watchlist_id
        }), 200
        
    except Exception as e:
        conn.rollback()
        status_err(f"Error adding stock to watchlist: {e}")
        return jsonify({
            "success": False,
            "message": "Failed to add stock to watchlist"
        }), 500
        
    finally:
        cursor.close()
        conn.close()


def check_stock_in_watchlist(user_id, stock_id):
    """
    Check if a stock is in user's watchlist
    Returns boolean indicating presence
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get user's watchlist
        cursor.execute(
            "SELECT watchlist_id FROM Watchlist WHERE user_id = %s LIMIT 1",
            (user_id,)
        )
        watchlist = cursor.fetchone()
        
        if not watchlist:
            return jsonify({
                "success": True,
                "in_watchlist": False
            }), 200
        
        # Check if stock is in watchlist
        cursor.execute(
            "SELECT id FROM Watchlist_Stocks WHERE watchlist_id = %s AND stock_id = %s",
            (watchlist['watchlist_id'], stock_id)
        )
        exists = cursor.fetchone()
        
        return jsonify({
            "success": True,
            "in_watchlist": bool(exists)
        }), 200
        
    except Exception as e:
        status_err(f"Error checking stock in watchlist: {e}")
        return jsonify({
            "success": False,
            "message": "Failed to check watchlist status"
        }), 500
        
    finally:
        cursor.close()
        conn.close()


def remove_stock_from_watchlist(user_id, stock_id):
    """
    Remove a stock from user's watchlist
    This will be used by your friend in the watchlist tab
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        status_warn(f"🗑️ remove_stock_from_watchlist called with user_id={user_id}, stock_id={stock_id}")
        
        # Get user's watchlist
        cursor.execute(
            "SELECT watchlist_id FROM Watchlist WHERE user_id = %s LIMIT 1",
            (user_id,)
        )
        watchlist = cursor.fetchone()
        
        if not watchlist:
            status_err(f"❌ No watchlist found for user_id={user_id}")
            return jsonify({
                "success": False,
                "message": "Watchlist not found"
            }), 404
        
        watchlist_id = watchlist['watchlist_id']
        status_ok(f"📋 Found watchlist_id={watchlist_id} for user_id={user_id}")
        
        # Check how many stocks are in the watchlist before deletion
        cursor.execute(
            "SELECT COUNT(*) as count FROM Watchlist_Stocks WHERE watchlist_id = %s",
            (watchlist_id,)
        )
        before_count = cursor.fetchone()['count']
        status_ok(f"📊 Stocks in watchlist BEFORE deletion: {before_count}")
        
        # Remove stock from watchlist
        status_warn(f"🔍 Executing DELETE: watchlist_id={watchlist_id}, stock_id={stock_id}")
        cursor.execute(
            "DELETE FROM Watchlist_Stocks WHERE watchlist_id = %s AND stock_id = %s",
            (watchlist_id, stock_id)
        )
        conn.commit()
        
        deleted_rows = cursor.rowcount
        status_ok(f"✅ Deleted {deleted_rows} row(s) from Watchlist_Stocks")
        
        # Check how many stocks remain
        cursor.execute(
            "SELECT COUNT(*) as count FROM Watchlist_Stocks WHERE watchlist_id = %s",
            (watchlist_id,)
        )
        after_count = cursor.fetchone()['count']
        status_ok(f"📊 Stocks in watchlist AFTER deletion: {after_count}")
        
        if deleted_rows == 0:
            status_warn(f"⚠️ No stock was deleted - stock_id={stock_id} not found in watchlist_id={watchlist_id}")
            return jsonify({
                "success": False,
                "message": "Stock not in watchlist"
            }), 404
        
        status_ok(f"✅ Successfully removed stock {stock_id} from watchlist for user {user_id}")
        
        return jsonify({
            "success": True,
            "message": "Stock removed from watchlist"
        }), 200
        
    except Exception as e:
        conn.rollback()
        status_err(f"Error removing stock from watchlist: {e}")
        return jsonify({
            "success": False,
            "message": "Failed to remove stock from watchlist"
        }), 500
        
    finally:
        cursor.close()
        conn.close()
