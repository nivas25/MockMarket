"""
User Management Controller
Handles user creation, authentication, and role assignment
"""
import logging
from typing import Tuple
from flask import jsonify
from db_pool import get_db_connection
from flask_jwt_extended import create_access_token
from datetime import timedelta
import os

logger = logging.getLogger(__name__)

# Admin emails (should be moved to environment variables in production)
ADMIN_EMAILS = set(os.getenv("ADMIN_EMAILS", "").split(",")) or {
    "manumahadev44@gmail.com",
    "nivas3347r@gmail.com"
}


def add_user_to_db(full_name: str, email: str) -> Tuple[dict, int]:
    """
    Create or retrieve user from database and generate JWT token
    
    Args:
        full_name: User's full name from Google
        email: User's email address
        
    Returns:
        Tuple of (response_dict, status_code)
    """
    logger.info(f"Processing user authentication: {email}")
    
    # Input validation
    if not full_name or not email:
        logger.warning("Missing required user data")
        return jsonify({"error": "Name and email are required"}), 400
    
    if "@" not in email or len(email) > 255:
        logger.warning(f"Invalid email format: {email}")
        return jsonify({"error": "Invalid email address"}), 400
    
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            user = None
            is_new_user = False
            
            # Try to insert new user
            try:
                insert_query = """
                    INSERT INTO `Users` (name, email_id, balance) 
                    VALUES (%s, %s, %s)
                """
                initial_balance = float(os.getenv("INITIAL_USER_BALANCE", "100000.00"))
                cursor.execute(insert_query, (full_name, email, initial_balance))
                conn.commit()
                user_id = cursor.lastrowid
                is_new_user = True
                logger.info(f"New user created: ID={user_id}, Email={email}")
                
                # Fetch newly created user
                cursor.execute(
                    "SELECT user_id, name, email_id, balance, created_at, access FROM `Users` WHERE user_id = %s",
                    (user_id,)
                )
                user = cursor.fetchone()
                
            except Exception as insert_error:
                # Handle duplicate email (user already exists)
                error_msg = str(insert_error).lower()
                if "duplicate" in error_msg or "unique" in error_msg:
                    logger.info(f"Existing user login: {email}")
                    cursor.execute(
                        "SELECT user_id, name, email_id, balance, created_at, access FROM `Users` WHERE email_id = %s",
                        (email,)
                    )
                    user = cursor.fetchone()
                else:
                    logger.error(f"Database error during user insert: {insert_error}")
                    raise
            
            # Validate user was found/created
            if not user:
                logger.error(f"Failed to retrieve user data for: {email}")
                return jsonify({"error": "Failed to create or retrieve user"}), 500
            
            # Check if user is blocked
            if user.get("access") == "blocked":
                logger.warning(f"Blocked user attempted login: {email}")
                return jsonify({
                    "message": "Access denied. Your account has been blocked. Please contact support.",
                    "status": "blocked"
                }), 403
            
            # Determine user role
            role = "admin" if email in ADMIN_EMAILS else "user"
            logger.info(f"User role assigned: {role} for {email}")
            
            # Generate JWT token
            token_expires = timedelta(days=int(os.getenv("JWT_EXPIRES_DAYS", "3")))
            token = create_access_token(
                identity={
                    "user_id": user["user_id"],
                    "name": user["name"],
                    "email": user["email_id"],
                    "balance": float(user["balance"]),
                    "joinedAt": str(user.get("created_at", "")),
                    "role": role
                },
                expires_delta=token_expires
            )
            
            cursor.close()
            
            logger.info(f"Authentication successful for: {email} (New: {is_new_user})")
            return jsonify({
                "message": "Authentication successful",
                "token": token,
                "role": role,
                "status": "unblocked",
                "is_new_user": is_new_user
            }), 200
            
    except Exception as e:
        logger.exception(f"Error in add_user_to_db for {email}: {e}")
        return jsonify({
            "error": "Authentication failed. Please try again later.",
            "details": str(e) if os.getenv("FLASK_ENV") == "development" else None
        }), 500
