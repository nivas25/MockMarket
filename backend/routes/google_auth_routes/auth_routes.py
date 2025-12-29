"""
Google OAuth routes.
Adds explicit CORS for production origins to satisfy browser preflight.
"""

import os
import logging
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from controller.google_auth.auth_controller import handle_google_login

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth_bp', __name__)

# Read allowed origins from environment (comma-separated)
_ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")


@auth_bp.route('/google-login', methods=['POST', 'OPTIONS'])
# NOTE: Use allow_headers (not headers) to avoid Flask-CORS warning. We rely on global CORS too,
# but keep this explicit for clarity and credentials support.
@cross_origin(
    origins=_ALLOWED_ORIGINS,
    methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True,
    max_age=3600
)
def google_login():
    # Handle CORS preflight quickly
    if request.method == 'OPTIONS':
        logger.debug("Preflight /auth/google-login responded")
        return '', 200

    if not request.is_json:
        return jsonify({"message": "Content-Type must be application/json"}), 400

    data = request.get_json(silent=True) or {}
    code = data.get('code')
    try:
        return handle_google_login(code)
    except Exception as e:
        # Belt-and-suspenders: ensure any unexpected error is logged here too
        logger.exception(f"Exception in /google-login: {e}")
        return jsonify({"message": "Internal server error"}), 500
