from flask import Blueprint, request, jsonify
from controller.holdings.holdings_controller import get_holdings


holdings_bp = Blueprint("holdings_bp",__name__)

@holdings_bp.route("/portfolio", methods=["POST"])
def holding_fetch_routes():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
          
        if not user_id:
            return jsonify({"error" : "User ID required !"})
        
        return get_holdings(user_id)
        
          
    except Exception as e:
        print("Error in holdings routes")
        return jsonify({"error": str(e)}), 500 