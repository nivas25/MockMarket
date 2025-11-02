from flask import jsonify
from db_pool import get_connection
from flask_jwt_extended import create_access_token
from datetime import timedelta

def add_user_to_db(full_name, email):
    print(f"🔹 Processing user: {full_name}, {email}")
    conn = None
    cursor = None
    
    try:
        conn = get_connection()
        if not conn:
            raise Exception("Could not get database connection")
            
        cursor = conn.cursor(dictionary=True)
        
        # Try inserting user
        try:
            insert_query = "INSERT INTO `Users` (name, email_id, balance) VALUES (%s, %s, 100000.00)"
            cursor.execute(insert_query, (full_name, email))
            conn.commit()
            user_id = cursor.lastrowid
            print(f"✅ New user created with ID: {user_id}")
            
            select_query = "SELECT user_id, name, email_id, balance, created_at, access FROM `Users` WHERE user_id = %s"
            cursor.execute(select_query, (user_id,))
            user = cursor.fetchone()
            
        except Exception as insert_error:
            # Duplicate email -> fetch existing user
            if "Duplicate entry" in str(insert_error) or "duplicate" in str(insert_error).lower():
                print("✅ User exists, fetching...")
                select_query = "SELECT user_id, name, email_id, balance, created_at, access FROM `Users` WHERE email_id = %s"
                cursor.execute(select_query, (email,))
                user = cursor.fetchone()
            else:
                raise insert_error
        
        if not user:
            raise Exception("Failed to retrieve user data")

        # 🔹 Check access status (blocked/unblocked)
        if user["access"] == "blocked":
            print(f"🚫 User {email} is blocked")
            return jsonify({
                "message": "Access denied. Your account has been blocked.",
                "status": "blocked"
            }), 403

        # 🔹 Determine role
        role = "admin" if email in ["manumahadev44@gmail.com", "nivas3347r@gmail.com"] else "user"
        print("present role is:", role)

        # Generate JWT token
        token = create_access_token(
            identity={
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email_id"],
                "balance": float(user["balance"]),
                "joinedAt": str(user.get("created_at", "")),
                "role": role
            },
            expires_delta=timedelta(days=3)
        )

        return jsonify({
            "message": "Authentication successful",
            "token": token,
            "role": role,
            "status": "unblocked"
        }), 200
        
    except Exception as e:
        print(f"❌ Error in add_user_to_db: {e}")
        if conn:
            conn.rollback()
        return jsonify({"error": str(e)}), 500
            
    finally: 
        if cursor:
            cursor.close()
        if conn:
            conn.close()
