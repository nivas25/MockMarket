# routes/auth.py

import os
import requests
from flask import Blueprint, request, jsonify
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
# from app import db      # --- (STEP 1) COMMENTED OUT
# from models import User # --- (STEP 2) COMMENTED OUT
# from flask_jwt_extended import create_access_token # --- (STEP 3) COMMENTED OUT

auth_bp = Blueprint('auth_bp', __name__)

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')

@auth_bp.route('/google-login', methods=['POST'])
def google_login():
    data = request.get_json()
    code = data.get('code')

    if not code:
        return jsonify({"message": "Authorization code not provided."}), 400

    try:
        # 1. Exchange code for tokens (Unchanged)
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
            'redirect_uri': 'postmessage',
            'grant_type': 'authorization_code'
        }
        
        token_response = requests.post(token_url, data=token_data)
        token_response_json = token_response.json()

        if 'id_token' not in token_response_json:
            return jsonify({"message": "Error exchanging Google code."}), 500

        google_id_token = token_response_json['id_token']
        
        # 2. Verify token (Unchanged)
        try:
            idinfo = id_token.verify_oauth2_token(
                google_id_token, 
                google_requests.Request(), 
                GOOGLE_CLIENT_ID
            )
        except ValueError as e:
            return jsonify({"message": "Invalid Google token."}), 401

        # --- 3. TEST PRINT (DATABASE LOGIC IS SKIPPED) ---
        
        email = idinfo.get('email')
        full_name = idinfo.get('name')

        print("---------------------------------")
        print("🎉 GOOGLE AUTH SUCCESS! 🎉")
        print(f"Verified User: {full_name}")
        print(f"Verified Email: {email}")
        print("---------------------------------")
        print("(Skipping database check for now...)")


        # --- (STEP 4) ALL DATABASE LOGIC COMMENTED OUT ---
        
        # Find user by 'email_id' instead of 'google_id'
        # user = User.query.filter_by(email_id=email).first()
        #
        # if user:
        #     user.name = full_name
        #     print(f"Found existing user: {user.email_id}")
        # else:
        #     user = User(
        #         email_id=email,
        #         name=full_name
        #     )
        #     db.session.add(user)
        #     print(f"Creating new user: {user.email_id}")
        # 
        # db.session.commit()
        
        # --- (STEP 5) FAKE TOKEN SENT INSTEAD OF REAL ONE ---
        
        # access_token = create_access_token(identity=user.user_id)
        # print(f"Generated JWT for user_id: {user.user_id}")

        # Send a FAKE token just to make the frontend happy
        access_token = "FAKE_TOKEN_FOR_TESTING_ONLY"

        return jsonify({
            "message": "Login successful (TESTING)",
            "token": access_token 
        }), 200

    except Exception as e:
        # db.session.rollback() # No database, no rollback
        print(f"Error in /google-login: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500