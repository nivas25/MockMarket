# controller/order/get_orders.py
"""
Production-ready controller for fetching user orders.
Retrieves order history with stock details.
"""

import logging
from typing import Optional, List, Dict, Any
from db_pool import get_db_connection

logger = logging.getLogger(__name__)


def get_user_orders(user_id: int) -> Optional[List[Dict[str, Any]]]:
    """
    Fetch all orders for a specific user with stock details.
    
    Args:
        user_id: User ID to fetch orders for
        
    Returns:
        List of order dictionaries, or None if error occurs
    """
    # Input validation
    if not user_id or not isinstance(user_id, int) or user_id <= 0:
        logger.error(f"Invalid user_id: {user_id}")
        return None

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            query = """
                SELECT 
                    o.order_id, 
                    o.user_id, 
                    o.trade_type, 
                    o.stock_id, 
                    o.quantity, 
                    o.order_type, 
                    o.created_at, 
                    s.company_name as stock_name
                FROM `Order` o
                JOIN Stocks s ON o.stock_id = s.stock_id
                WHERE o.user_id = %s
                ORDER BY o.created_at DESC
            """
            
            cursor.execute(query, (user_id,))
            orders = cursor.fetchall()
            cursor.close()
            
            logger.info(f"Fetched {len(orders)} orders for user_id={user_id}")
            return orders
            
    except Exception as e:
        logger.error(f"Error fetching orders for user_id {user_id}: {e}", exc_info=True)
        return None