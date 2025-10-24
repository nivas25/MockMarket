# controller/auth_controller.py

import os
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from flask import jsonify

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')

def handle_google_login(code):
    if not code:
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
        
        token_response = requests.post(token_url, data=token_data)
        token_response_json = token_response.json()

        if 'id_token' not in token_response_json:
            return jsonify({"message": "Error exchanging Google code."}), 500

        google_id_token = token_response_json['id_token']

        # Step 2: Verify token
        try:
            idinfo = id_token.verify_oauth2_token(
                google_id_token,
                google_requests.Request(),
                GOOGLE_CLIENT_ID
            )
        except ValueError:
            return jsonify({"message": "Invalid Google token."}), 401

        # Step 3: Print details (for testing)
        email = idinfo.get('email')
        full_name = idinfo.get('name')

        print("---------------------------------")
        print("🎉 GOOGLE AUTH SUCCESS! 🎉")
        print(f"Verified User: {full_name}")
        print(f"Verified Email: {email}")
        print("---------------------------------")
        print("(Skipping database check for now...)")

        # Step 4: Return a fake token for testing
        access_token = "FAKE_TOKEN_FOR_TESTING_ONLY"

        return jsonify({
            "message": "Login successful (TESTING)",
            "token": access_token
        }), 200

    except Exception as e:
        print(f"Error in /google-login: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500
