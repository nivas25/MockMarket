import db_pool

def fetch_users():
    conn = None
    cursor = None
    try:
        # ✅ Get connection from pool
        conn = db_pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        # ✅ Fetch all non-admin users
        query = """
        SELECT * FROM Users 
        WHERE email_id NOT IN ('manumahadev44@gmail.com', 'nivas3347r@gmail.com')
        """
        cursor.execute(query)
        users = cursor.fetchall()

        return users  # returns list of dicts
    except Exception as e:
        print(f"❌ Error fetching users: {e}")
        return []
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
