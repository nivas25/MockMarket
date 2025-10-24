# controller/auth_controller.py

import os
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from .addUser_controller import add_user_to_db
from flask import jsonify

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')

def handle_google_login(code):
    print("🔹 Received /google-login request")
    print(f"🔹 Code from request: {code}")

    if not code:
        print("❌ No code provided in request")
        return jsonify({"message": "Authorization code not provided."}), 400

    try:
        # Step 1: Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': os.environ.get('GOOGLE_CLIENT_SECRET'),
            'redirect_uri': 'postmessage',
            'grant_type': 'authorization_code'
        }

        print("🔹 Sending POST request to Google for token exchange...")
        token_response = requests.post(token_url, data=token_data)
        print(f"🔹 Raw response from Google: {token_response.text}")

        token_response_json = token_response.json()
        if 'id_token' not in token_response_json:
            print("❌ 'id_token' not found in Google response")
            return jsonify({"message": "Error exchanging Google code."}), 500

        google_id_token = token_response_json['id_token']
        print("🔹 Verifying Google ID token...")

        # Step 2: Verify token
        try:
            idinfo = id_token.verify_oauth2_token(
                google_id_token,
                google_requests.Request(),
                GOOGLE_CLIENT_ID,
            )
            print("✅ Token verified successfully")
        except ValueError as e:
            print(f"❌ Token verification failed: {e}")
            return jsonify({"message": "Invalid Google token."}), 401

        # Step 3: Extract user info
        email = idinfo.get('email')
        full_name = idinfo.get('name')
        
        return add_user_to_db(full_name, email)

        print("---------------------------------")
        print("🎉 GOOGLE AUTH SUCCESS! 🎉")
        print(f"Verified User: {full_name}")
        print(f"Verified Email: {email}")
        print("---------------------------------")

        
    except Exception as e:
        print(f"❌ Exception in /google-login: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500
