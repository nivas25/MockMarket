from db_pool import get_connection
from flask import jsonify

def delete_user(user_id):
    print(f" Deleting user id {user_id} ...")
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # ✅ Call stored procedure
        cursor.callproc('delete_user_all_data', [user_id])

        # ✅ Fetch result message (from SELECT inside procedure)
        for result in cursor.stored_results():
            msg = result.fetchall()

        conn.commit()
        print("✅ User deletion completed successfully")

        return jsonify({
            "status": "success",
            "message": msg[0]["message"] if msg else f"User {user_id} deleted successfully"
        }), 200

    except Exception as e:
        print("❌ Error while deleting user:", str(e))
        if conn:
            conn.rollback()
        return jsonify({
            "status": "error",
            "message": f"Error while deleting user: {str(e)}"
        }), 500

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
