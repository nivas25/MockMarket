from flask import jsonify
from db_pool import get_connection

def get_holdings(user_id):
    try:
        if not user_id:
            return jsonify({"error":"User Id is Required !"}),400
        
        conn = get_connection()
        cursor = conn.cursor(dictionary = True)
        print("fetching holdins")
        cursor.callproc("get_user_holdings_with_balance", [user_id])
        
        for result in cursor.stored_results():
            holdings=result.fetchall()
            
        cursor.close()
        conn.close()
        
        return jsonify({
            "status":"success",
            "holdings":holdings
        }),200
        
    except Exception as e:
        print("Error fetching holdings",e)
        return jsonify({"error":str(e)}),500
    
    finally:
        try:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
        except:
            pass