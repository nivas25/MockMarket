"""
Google OAuth routes.
Adds explicit CORS for production origins to satisfy browser preflight.
"""

import os
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from controller.google_auth.auth_controller import handle_google_login

auth_bp = Blueprint('auth_bp', __name__)

# Read allowed origins from environment (comma-separated)
_ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")


@auth_bp.route('/google-login', methods=['POST', 'OPTIONS'])
@cross_origin(origins=_ALLOWED_ORIGINS, methods=["POST", "OPTIONS"], headers=["Content-Type", "Authorization"])
def google_login():
    # Handle CORS preflight quickly
    if request.method == 'OPTIONS':
        return '', 200

    if not request.is_json:
        return jsonify({"message": "Content-Type must be application/json"}), 400

    data = request.get_json(silent=True) or {}
    code = data.get('code')
    return handle_google_login(code)
