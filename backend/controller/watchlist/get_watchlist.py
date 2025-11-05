# controller/watchlist_controller.py

import logging
from typing import Dict, Any, List
from db_pool import get_connection  # Assuming you have a DB connection pool
from collections import defaultdict

logger = logging.getLogger(__name__)

def get_user_watchlists(user_id: int) -> Dict[str, Any]:
    """
    Fetch all watchlists for a given user_id, including individual stock names and their current prices from Stock_Prices.
    
    Args:
        user_id (int): The ID of the user.
    
    Returns:
        Dict: {
            'status': 'success' or 'error',
            'data': List of watchlist dicts with stocks or None,
            'message': str (error message if failed)
        }
        Each watchlist dict: {
            'watchlist_id': int,
            'watchlist_name': str,
            'stocks': List of {'stock_name': str, 'current_price': float or None}
        }
    """
    connection = get_connection()
    if not connection:
        logger.error(f"Database connection failed for user_id: {user_id}")
        return {
            'status': 'error',
            'data': None,
            'message': 'Failed to connect to database. Please try again later.'
        }

    try:
        cursor = connection.cursor(dictionary=True)
        # Query to fetch individual stocks per watchlist with prices (using 'ltp' as current price)
        query = """
            SELECT 
              w.watchlist_id,
              w.name AS watchlist_name,
              s.company_name AS stock_name,
              sp.ltp AS current_price
            FROM Watchlist w
            INNER JOIN Watchlist_Stocks ws ON w.watchlist_id = ws.watchlist_id
            INNER JOIN Stocks s ON ws.stock_id = s.stock_id
            LEFT JOIN Stock_Prices sp ON s.stock_id = sp.stock_id  -- LEFT JOIN to include stocks without price
            WHERE w.user_id = %s
            ORDER BY w.name, s.company_name
        """
        cursor.execute(query, (user_id,))
        results = cursor.fetchall()

        # Group results by watchlist_id
        watchlist_groups = defaultdict(list)
        for row in results:
            watchlist_groups[row['watchlist_id']].append({
                'stock_name': row['stock_name'],
                'current_price': row['current_price']  # float or None if no price
            })

        # Convert to structured list of watchlists
        watchlists = []
        for watchlist_id, stocks in watchlist_groups.items():
            # Get watchlist name (from first row, assuming consistent)
            sample_row = next((r for r in results if r['watchlist_id'] == watchlist_id), None)
            if sample_row:
                watchlists.append({
                    'watchlist_id': watchlist_id,
                    'watchlist_name': sample_row['watchlist_name'],
                    'stocks': stocks
                })

        logger.info(f"Fetched {len(watchlists)} watchlists with total {sum(len(wl['stocks']) for wl in watchlists)} stocks for user_id: {user_id}")
        return {
            'status': 'success',
            'data': watchlists,
            'message': 'Watchlists with stock prices fetched successfully.'
        }

    except Exception as e:
        logger.error(f"Error fetching watchlists for user_id {user_id}: {str(e)}")
        return {
            'status': 'error',
            'data': None,
            'message': f'Failed to fetch watchlists: {str(e)}'
        }
    finally:
        if connection:
            connection.close()