# order_status.py

from datetime import datetime

def create_pending_order(connection, stock_id, user_id, trade_type, quantity):
    """
    Store pending order when market is closed
    """

    try:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute("""
            INSERT INTO `Order` (order_type, stock_id, user_id, quantity, trade_type, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, ("pending", stock_id, user_id, quantity,trade_type))

        
        connection.commit()
        cursor.close()

        return {
            "status": "pending",
            "message": "Market closed. Order stored as pending.",
            "order_details": {
                "stock_id": stock_id,
                "user_id": user_id,
                "trade_type": trade_type,
                "quantity": quantity,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        }

    except Exception as e:
        connection.rollback()
        return {"status": "error", "message": str(e)}
