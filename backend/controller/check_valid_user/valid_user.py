import jwt
from flask import request, jsonify
import os
from db_pool import get_connection  # ✅ use your existing pooled connection

SECRET_KEY = os.getenv("JWT_SECRET_KEY")

def verify_user():
    try:
        # 1️⃣ Get Authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return jsonify({"msg": "Missing Authorization header"}), 401

        if not auth_header.startswith("Bearer "):
            return jsonify({"msg": "Bad Authorization header. Expected 'Bearer <JWT>'"}), 401

        token = auth_header.split(" ")[1]

        # 2️⃣ Decode JWT token
        if not SECRET_KEY:
            return jsonify({"msg": "JWT_SECRET_KEY missing in environment"}), 500

        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"verify_sub": False})
        user_data = decoded.get("sub")

        if not user_data or "user_id" not in user_data:
            return jsonify({"msg": "Invalid token payload. Missing user_id"}), 401

        user_id = user_data["user_id"]

        # 3️⃣ Verify user existence from DB
        conn = get_connection()
        if not conn:
            return jsonify({"msg": "Database connection failed"}), 500

        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT user_id, access FROM Users WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return jsonify({"msg": "User does not exist or has been deleted"}), 401

        if user["access"] == "blocked":
            return jsonify({"msg": "User account is blocked"}), 403

        # 4️⃣ Success
        return jsonify({
            "valid": True,
            "user": {"user_id": user_id, "access": user["access"]}
        }), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"msg": "Token expired"}), 401
    except jwt.InvalidTokenError as e:
        return jsonify({"msg": f"Invalid token: {str(e)}"}), 401
    except Exception as e:
        print("[SERVER ERROR] ❌", str(e))
        return jsonify({"msg": f"Server Error: {str(e)}"}), 500
