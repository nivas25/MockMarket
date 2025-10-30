import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import pooling
import urllib.parse as urlparse

load_dotenv()

# Support both DATABASE_URI and individual DB_* env vars
_db_uri = os.getenv("DATABASE_URI")
dbconfig = {}
if _db_uri:
    url = urlparse.urlparse(_db_uri)
    dbconfig = {
        "user": url.username,
        "password": url.password,
        "host": url.hostname,
        "port": url.port,
        "database": (url.path or "").lstrip("/"),
        "ssl_ca": os.path.join(os.path.dirname(__file__), "ca.pem"),
        "use_pure": True,
    }
else:
    # Fallback to discrete env vars
    dbconfig = {
        "user": os.getenv("DB_USER"),
        "password": os.getenv("DB_PASSWORD"),
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "database": os.getenv("DB_NAME"),
        "ssl_ca": os.path.join(os.path.dirname(__file__), "ca.pem"),
        "use_pure": True,
    }

# Lazy initialization - pool created on first use
connection_pool = None

def _ensure_pool():
    """Create connection pool if not exists"""
    global connection_pool
    if connection_pool is None:
        try:
            # Cap pool to avoid exhausting MySQL max_connections
            pool_size = int(os.getenv("DB_POOL_SIZE", "5"))
            connection_pool = pooling.MySQLConnectionPool(
                pool_name="mockmarket_pool",
                pool_size=pool_size,
                pool_reset_session=True,
                **dbconfig
            )
            print(f"✅ Connection pool created successfully with {pool_size} connections!")
        except Exception as e:
            print("❌ Error creating pool:", e)
            raise

def get_connection():
    """Get a connection from the pool"""
    try:
        _ensure_pool()
        return connection_pool.get_connection()
    except Exception as e:
        print("❌ Error getting connection from pool:", str(e))
        raise Exception("Database connection failed") from e
