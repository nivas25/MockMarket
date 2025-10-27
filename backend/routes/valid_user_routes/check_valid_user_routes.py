from flask import Blueprint
from controller.check_valid_user.valid_user import verify_user

verify_bp = Blueprint("verify_bp", __name__)
verify_bp.route("/verify", methods=["GET"])(verify_user)
