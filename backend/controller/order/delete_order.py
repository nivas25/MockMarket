from db_pool import get_connection

def delete_order(order_id):
    connection = None
    try:
        connection = get_connection()
        cursor = connection.cursor(dictionary=True)
        print("Got order id", order_id)
        query = """
            DELETE FROM `Order` WHERE order_id = %s
        """
        cursor.execute(query, (order_id,))
        connection.commit()
        cursor.close()
        return {"status": "success", "message": "Order deleted successfully"}
    except Exception as e:
        print(f"Error deleting order: {e}")
        if connection:
            connection.rollback()
        return {"status": "error", "message": f"Failed to delete order: {str(e)}"}
    finally:
        if connection and connection.is_connected():
            connection.close()