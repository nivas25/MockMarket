from flask import Blueprint, jsonify
from controller.admin_fetch.fetch_users_admin import fetch_users as fetch_users_from_db

fetch_users_bp = Blueprint("fetch_users_bp", __name__)

@fetch_users_bp.route("/fetch_user", methods=["GET"])
def get_all_users():
    print("📥 Fetching all users...")
    users = fetch_users_from_db()

    if not users:
        return jsonify({"message": "No users found"}), 404

    return jsonify({"users": users}), 200
