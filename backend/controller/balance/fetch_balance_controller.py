import db_pool  # Removed unused 'requests' import

def user_balance_fetch(user_id: int):
    conn = None
    cursor = None
    try:
        conn = db_pool.get_connection()
        cursor = conn.cursor()
        query = "SELECT balance FROM Users WHERE user_id = %s"
        cursor.execute(query, (user_id,))
        if row := cursor.fetchone():
            return row[0]
        return None  # Explicitly return None if no user found
    except Exception as e:
        print(f"Error fetching balance for user {user_id}: {e}")  # Optional logging
        return None
    finally:
        if cursor:
            cursor.close()
        if conn and hasattr(conn, 'is_connected') and conn.is_connected():
            conn.close()