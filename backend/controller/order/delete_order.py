# controller/order/delete_order.py
"""
Production-ready controller for deleting orders.
Handles order cancellation with proper validation and logging.
"""

import logging
from typing import Dict, Any
from db_pool import get_db_connection

logger = logging.getLogger(__name__)


def delete_order(order_id: int, user_id: int = None) -> Dict[str, Any]:
    """
    Delete a specific order from the database.
    
    Args:
        order_id: Order ID to delete
        user_id: Optional user ID for ownership verification
        
    Returns:
        Dictionary with status and message
    """
    # Input validation
    if not order_id or not isinstance(order_id, int) or order_id <= 0:
        logger.error(f"Invalid order_id: {order_id}")
        return {"status": "error", "message": "Invalid order ID"}

    try:
        with get_db_connection() as connection:
            cursor = connection.cursor(dictionary=True)
            
            # Optional: Verify order ownership if user_id provided
            if user_id:
                cursor.execute(
                    "SELECT user_id FROM `Order` WHERE order_id = %s", 
                    (order_id,)
                )
                order = cursor.fetchone()
                
                if not order:
                    logger.warning(f"Order {order_id} not found")
                    return {"status": "error", "message": "Order not found"}
                
                if order['user_id'] != user_id:
                    logger.warning(
                        f"User {user_id} attempted to delete order {order_id} "
                        f"owned by user {order['user_id']}"
                    )
                    return {
                        "status": "error", 
                        "message": "You don't have permission to delete this order"
                    }
            
            # Delete the order
            query = "DELETE FROM `Order` WHERE order_id = %s"
            cursor.execute(query, (order_id,))
            rows_affected = cursor.rowcount
            connection.commit()
            cursor.close()
            
            if rows_affected > 0:
                logger.info(f"Order deleted: order_id={order_id}, user_id={user_id}")
                return {
                    "status": "success", 
                    "message": "Order deleted successfully"
                }
            else:
                logger.warning(f"No order found with order_id={order_id}")
                return {
                    "status": "error", 
                    "message": "Order not found"
                }
            
    except Exception as e:
        logger.error(f"Error deleting order {order_id}: {e}", exc_info=True)
        return {
            "status": "error", 
            "message": "Failed to delete order. Please try again."
        }