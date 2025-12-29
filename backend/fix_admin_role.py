"""
Quick script to verify admin users in database
This doesn't modify the database, just checks the current status
"""
import db_pool

ADMIN_EMAILS = {
    "manumahadev44@gmail.com",
    "nivas3347r@gmail.com"
}

def check_admin_users():
    conn = None
    cursor = None
    try:
        conn = db_pool.get_connection()
        if not conn:
            print("❌ Failed to connect to database")
            return
        
        cursor = conn.cursor(dictionary=True)
        
        print("\n" + "="*60)
        print("ADMIN USER STATUS CHECK")
        print("="*60 + "\n")
        
        for email in ADMIN_EMAILS:
            cursor.execute(
                "SELECT user_id, name, email_id, balance, created_at FROM Users WHERE email_id = %s",
                (email,)
            )
            user = cursor.fetchone()
            
            if user:
                print(f"✅ Found: {email}")
                print(f"   User ID: {user['user_id']}")
                print(f"   Name: {user['name']}")
                print(f"   Balance: ₹{user['balance']}")
                print(f"   Created: {user['created_at']}")
            else:
                print(f"❌ Not found: {email}")
            print()
        
        print("="*60)
        print("\n💡 Note: Role is assigned during login based on email.")
        print("   To get admin access, simply log out and log back in.")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    check_admin_users()
