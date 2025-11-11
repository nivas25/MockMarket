# controller/order/order_status.py
"""
Production-ready order status controller for pending orders.
Handles order creation when market is closed.
"""

import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)


def create_pending_order(
    connection, 
    stock_id: int, 
    user_id: int, 
    trade_type: str, 
    quantity: int
) -> Dict[str, Any]:
    """
    Store pending order when market is closed.
    
    Args:
        connection: Active database connection
        stock_id: Stock identifier
        user_id: User placing the order
        trade_type: 'Buy' or 'Sell'
        quantity: Number of shares
        
    Returns:
        Dictionary with status and order details
    """
    # Input validation
    if trade_type not in ["Buy", "Sell"]:
        logger.error(f"Invalid trade_type '{trade_type}' for pending order")
        return {"status": "error", "message": "Invalid trade type"}
    
    if quantity <= 0:
        logger.error(f"Invalid quantity {quantity} for pending order")
        return {"status": "error", "message": "Quantity must be positive"}

    try:
        cursor = connection.cursor(dictionary=True)
        
        # Insert pending order
        cursor.execute("""
            INSERT INTO `Order` (order_type, stock_id, user_id, quantity, trade_type, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, ("pending", stock_id, user_id, quantity, trade_type))

        order_id = cursor.lastrowid
        connection.commit()
        cursor.close()
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        logger.info(
            f"Pending order created: order_id={order_id}, user_id={user_id}, "
            f"stock_id={stock_id}, trade_type={trade_type}, quantity={quantity}"
        )

        return {
            "status": "pending",
            "message": "Market closed. Order stored as pending and will be executed when market opens.",
            "order_details": {
                "order_id": order_id,
                "stock_id": stock_id,
                "user_id": user_id,
                "trade_type": trade_type,
                "quantity": quantity,
                "timestamp": timestamp
            }
        }

    except Exception as e:
        connection.rollback()
        logger.error(f"Error creating pending order: {e}", exc_info=True)
        return {
            "status": "error", 
            "message": "Failed to create pending order. Please try again."
        }
