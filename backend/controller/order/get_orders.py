# controller/orders_controller.py

from db_pool import get_connection  # Assuming you have a db_pool module for connection pooling

def get_user_orders(user_id):
    connection = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        print("Got user id ", user_id)
        query = """
            SELECT o.order_id, o.user_id, o.trade_type, o.stock_id, o.quantity, o.order_type, o.created_at, s.company_name as stock_name
            FROM `Order` o
            JOIN Stocks s ON o.stock_id = s.stock_id
            WHERE o.user_id = %s
            ORDER BY o.created_at DESC
        """
        cursor.execute(query, (user_id,))
        orders = cursor.fetchall()
        cursor.close()
        return orders
    except Exception as e:
        print(f"Error fetching orders: {e}")
        return None
    finally:
        if connection and connection.is_connected():
            connection.close()