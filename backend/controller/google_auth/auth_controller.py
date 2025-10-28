# controller/auth_controller.py

import os
import requests
from .addUser_controller import add_user_to_db
from flask import jsonify

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')

def handle_google_login(code):
    print("🔹 Google login request received")

    if not code:
        print("❌ No code provided")
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

        token_response = requests.post(token_url, data=token_data, timeout=3)  # 3 second timeout
        token_response_json = token_response.json()
        
        if 'id_token' not in token_response_json:
            print("❌ 'id_token' not found in Google response")
            return jsonify({"message": "Error exchanging Google code."}), 500

        google_id_token = token_response_json['id_token']

        # Step 2: Decode token (skip verification since we got it from Google's OAuth endpoint)
        import json
        import base64
        
        # Decode JWT payload (second part of JWT)
        try:
            # JWT format: header.payload.signature
            payload_encoded = google_id_token.split('.')[1]
            # Add padding if needed
            payload_encoded += '=' * (4 - len(payload_encoded) % 4)
            payload_decoded = base64.urlsafe_b64decode(payload_encoded)
            idinfo = json.loads(payload_decoded)
        except Exception as e:
            print(f"❌ Token decode failed: {e}")
            return jsonify({"message": "Invalid Google token."}), 401

        # Step 3: Extract user info and process
        email = idinfo.get('email')
        full_name = idinfo.get('name')
        
        return add_user_to_db(full_name, email)


        
    except Exception as e:
        print(f"❌ Exception in /google-login: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500
