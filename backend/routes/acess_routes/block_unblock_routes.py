from flask import Blueprint, request
from controller.access_controller.block_unblock_user import update_user_access_controller

manage_user_access_bp = Blueprint("manage_user_access_bp", __name__)

@manage_user_access_bp.route("/update_access/<int:user_id>", methods=["PUT"])
def manage_user_access(user_id):
    data = request.get_json()
    access = data.get("access")  # "blocked" or "unblocked"

    return update_user_access_controller(user_id, access)
