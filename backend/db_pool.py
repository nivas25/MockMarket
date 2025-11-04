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
        "connection_timeout": 10,  # 10s timeout for initial connection
        "autocommit": True,  # Enable autocommit for better performance
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
        "connection_timeout": 10,  # 10s timeout for initial connection
        "autocommit": True,  # Enable autocommit for better performance
    }

# Connection pool - will be initialized eagerly at startup
connection_pool = None

def initialize_pool():
    """
    Initialize connection pool eagerly at startup.
    Call this from app.py before starting the server.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    global connection_pool
    if connection_pool is None:
        try:
            pool_size = int(os.getenv("DB_POOL_SIZE", "15"))
            logger.info(f"Initializing database pool with {pool_size} connections...")
            
            import time
            start = time.perf_counter()
            
            connection_pool = pooling.MySQLConnectionPool(
                pool_name="mockmarket_pool",
                pool_size=pool_size,
                pool_reset_session=True,
                **dbconfig
            )
            
            elapsed = time.perf_counter() - start
            logger.info(f"Connection pool ready in {elapsed:.2f}s ({pool_size} connections)")
            
            # Warm up by getting and returning a connection
            try:
                conn = connection_pool.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT 1")
                cursor.close()
                conn.close()
                logger.info("Pool warmup successful - connections validated")
            except Exception as e:
                logger.warning(f"Pool warmup warning: {e}")
                
        except Exception as e:
            logger.error(f"Error creating pool: {e}")
            raise
    return connection_pool

def _ensure_pool():
    """Ensure pool exists (fallback for legacy code)"""
    global connection_pool
    if connection_pool is None:
        print("⚠️  Pool not initialized at startup, creating now...")
        initialize_pool()

def get_connection():
    """Get a connection from the pool"""
    try:
        _ensure_pool()
        return connection_pool.get_connection()
    except Exception as e:
        print("❌ Error getting connection from pool:", str(e))
        raise Exception("Database connection failed") from e
