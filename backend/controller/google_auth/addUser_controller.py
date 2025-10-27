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
        
        # Optimized: Try insert first, if duplicate then just fetch
        try:
            insert_query = "INSERT INTO `Users` (name, email_id, balance) VALUES (%s, %s, 100000.00)"
            cursor.execute(insert_query, (full_name, email))
            conn.commit()
            user_id = cursor.lastrowid
            print(f"✅ New user created with ID: {user_id}")
            
            # Fetch the newly created user
            select_query = "SELECT user_id, name, email_id, balance, created_at FROM `Users` WHERE user_id = %s"
            cursor.execute(select_query, (user_id,))
            user = cursor.fetchone()
            
        except Exception as insert_error:
            # User already exists (duplicate email), just fetch
            if "Duplicate entry" in str(insert_error) or "duplicate" in str(insert_error).lower():
                print("✅ User exists, fetching...")
                select_query = "SELECT user_id, name, email_id, balance, created_at FROM `Users` WHERE email_id = %s"
                cursor.execute(select_query, (email,))
                user = cursor.fetchone()
            else:
                raise insert_error
        
        if not user:
            raise Exception("Failed to retrieve user data")
            
        token = create_access_token(
            identity={
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email_id"],
                "balance": float(user["balance"]),
                "joinedAt": str(user.get("created_at", ""))
            },
            expires_delta=timedelta(days=3)
        )

        return jsonify({
            "message": "Authentication successful",
            "token": token,
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
    
    
    