from flask import jsonify
from db_pool import get_connection
from flask_jwt_extended import create_access_token
from datetime import timedelta

def add_user_to_db(full_name, email):
    print(f"🔹 Adding user to DB: {full_name}, {email}")
    conn = None
    cursor = None
    
    try:
        conn = get_connection()
        if not conn:
            raise Exception("Could not get database connection")
            
        cursor = conn.cursor(dictionary=True)
        print("fetching user from DB if exists")
        select_query = "SELECT user_id, name, email_id, balance FROM `Users` WHERE email_id = %s"
        user = cursor.execute(select_query, (email,))
        user = cursor.fetchone()
        
        if user:
            print("User already exists")
        else:
            insert_query = "INSERT INTO `Users` (name, email_id, balance) VALUES (%s, %s, %s)"
            cursor.execute(insert_query, (full_name, email, 100000.00))
            conn.commit()
            
            cursor.execute(select_query, (email,))
            user = cursor.fetchone()
            print("New user added to database")
            
        token = create_access_token(
            identity={
                "user_id": user["user_id"],
                "name": user["name"],
                "email": user["email_id"],
                "balance": float(user["balance"]),  # ✅ match frontend key
                "joinedAt": str(user.get("created_at", ""))  # optional
            },
            expires_delta=timedelta(days=3)
        )

        return jsonify(
            {
                "message":"Authentication successful",
                "token":token,
                
            }
        ),200
    except Exception as e:
        print(f"❌ Error in add_user_to_db: {e}")
        return jsonify({"error": str(e)}), 500
            
    finally: 
        if cursor:
            cursor.close()
        if conn:
            conn.close()
    
    
    