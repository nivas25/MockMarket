from flask import jsonify
from db_pool import get_connection

def update_user_access_controller(user_id, access):
    """
    Update user's access status (blocked/unblocked).
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        query = "UPDATE Users SET access = %s WHERE user_id = %s"
        cursor.execute(query, (access, user_id))
        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({"message": f"User {user_id} has been {access}"}), 200

    except Exception as e:
        print("❌ Error in update_user_access_controller:", e)
        return jsonify({"error": str(e)}), 500
