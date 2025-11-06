from flask import Blueprint, request, jsonify
from controller.delete_controller.delete_users import delete_user
from flask_cors import cross_origin

# Define a Blueprint for delete user routes
delete_user_bp = Blueprint("delete_user_bp", __name__)

@delete_user_bp.route("/delete", methods=["DELETE", "OPTIONS"])
@cross_origin(origins=["http://localhost:3000"], methods=["DELETE", "OPTIONS"], headers=["Content-Type"])
def delete_user_route():
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return '', 200

    try:
        data = request.get_json()
        if not data or "user_id" not in data:
            return jsonify({
                "status": "error",
                "message": "Missing user_id in request body."
            }), 400

        user_id = data["user_id"]
        return delete_user(user_id)

    except Exception as e:
        print(f"[❌ ROUTE ERROR] {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Server error: {str(e)}"
        }), 500
