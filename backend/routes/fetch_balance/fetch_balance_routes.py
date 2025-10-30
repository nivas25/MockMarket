from flask import Blueprint, jsonify,request 
from controller.balance.fetch_balance_controller import user_balance_fetch


balance_bp = Blueprint("balance_bp", __name__)

@balance_bp.route("/user_balance",methods=["POST"])
def get_user_balance():
    print("fetching user balance")
    try:
        data = request.get_json()
        if not data or  "user_id" not in data:
            return jsonify({
                "status": "error",
                "message": "Missing user_id in request body."
            }), 400
        user_id = data["user_id"]
        balance = user_balance_fetch(user_id)
        if balance is None:
            return jsonify({
                "status": "error",
                "message": f"User with ID {user_id} not found."
            })
        return jsonify({
            "status": "success",
            "balance": float(balance)
        }),200
            
    except Exception as e:
        print(f"Error in get_user_balance: {e}")
        return jsonify({
            "status": "error",
            "message": "Internal server error"
        }), 500