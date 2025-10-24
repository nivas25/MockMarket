# routes/auth.py

from flask import Blueprint, request
from controller.google_auth.auth_controller import handle_google_login

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/google-login', methods=['POST'])
def google_login():
    data = request.get_json()
    code = data.get('code')
    return handle_google_login(code)
