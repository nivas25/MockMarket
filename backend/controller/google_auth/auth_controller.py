"""
Google OAuth controller: exchanges auth code for tokens and creates/returns user JWT.
Adds robust logging and clear error handling to diagnose 500s in production.
"""

import os
import json
import base64
import logging
import requests
from flask import jsonify
from .addUser_controller import add_user_to_db

logger = logging.getLogger(__name__)

GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')


def _decode_jwt_payload(jwt_token: str) -> dict:
    """Decode the payload part of a JWT without verification (best-effort)."""
    parts = jwt_token.split('.')
    if len(parts) < 2:
        raise ValueError("Malformed ID token")
    payload_encoded = parts[1]
    # Add padding if needed
    padding = '=' * (-len(payload_encoded) % 4)
    payload_encoded += padding
    payload_decoded = base64.urlsafe_b64decode(payload_encoded)
    return json.loads(payload_decoded)


def handle_google_login(code):
    logger.info("Google login request received")

    # Validate env configuration
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        logger.critical("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set")
        return jsonify({
            "message": "Server auth misconfiguration. Contact support."
        }), 500

    if not code:
        logger.warning("No authorization code provided")
        return jsonify({"message": "Authorization code not provided."}), 400

    try:
        # Step 1: Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            'code': code,
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'redirect_uri': 'postmessage',
            'grant_type': 'authorization_code'
        }

        logger.debug("Exchanging code for tokens at Google OAuth endpoint")
        resp = requests.post(token_url, data=token_data, timeout=10)

        # Attempt to parse JSON even on non-200 for detailed error
        try:
            payload = resp.json()
        except Exception:
            payload = {"raw": resp.text}

        if resp.status_code != 200:
            # Common causes: mismatched client ID/secret, wrong OAuth client type, origin mismatch
            logger.error(
                f"Google token exchange failed: status={resp.status_code}, payload={payload}"
            )
            return jsonify({
                "message": "Google login failed during token exchange.",
                "hint": "Check Google OAuth Client ID/Secret and authorized origins",
            }), 400

        id_token = payload.get('id_token')
        if not id_token:
            logger.error(f"No id_token in Google response: {payload}")
            return jsonify({"message": "Google did not return an id_token"}), 400

        # Step 2: Decode payload (trusting token from Google token endpoint)
        try:
            idinfo = _decode_jwt_payload(id_token)
        except Exception as e:
            logger.error(f"ID token decode failed: {e}")
            return jsonify({"message": "Invalid Google token"}), 401

        email = idinfo.get('email')
        full_name = idinfo.get('name') or idinfo.get('given_name')
        if not email:
            logger.error(f"Email missing in Google id_token payload: {idinfo}")
            return jsonify({"message": "Google token missing email"}), 400

        # Step 3: Create/fetch user and return application JWT
        result = add_user_to_db(full_name or "Google User", email)
        return result

    except requests.Timeout:
        logger.error("Google token exchange timeout")
        return jsonify({"message": "Google token service timeout. Please retry."}), 504
    except Exception as e:
        logger.exception(f"Unhandled exception in /auth/google-login: {e}")
        # Hide internal details in production
        return jsonify({"message": "Internal server error"}), 500
