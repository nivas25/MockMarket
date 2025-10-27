import jwt
from flask import request, jsonify
from datetime import datetime
import os

SECRET_KEY = os.getenv("JWT_SECRET_KEY")

def verify_user():
    auth_header = request.headers.get("Authorization")

    if not auth_header:
        return jsonify({"msg": "Missing Authorization header"}), 401

    try:
        if not auth_header.startswith("Bearer "):
            return jsonify({"msg": "Bad Authorization header. Expected 'Authorization: Bearer <JWT>'"}), 401

        token = auth_header.split(" ")[1]
        
        # 👇 disable 'sub' string verification
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"verify_sub": False})
        user_data = decoded.get("sub")

        return jsonify({
            "valid": True,
            "user": user_data
        }), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"msg": "Token expired"}), 401
    except jwt.InvalidTokenError as e:
        return jsonify({"msg": f"Invalid token: {str(e)}"}), 401
