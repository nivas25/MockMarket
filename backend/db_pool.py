import os
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import pooling
import urllib.parse as urlparse

load_dotenv()

db_uri = os.getenv("DATABASE_URI")  

url = urlparse.urlparse(db_uri)

dbconfig = {
    "user": url.username,
    "password": url.password,
    "host": url.hostname,
    "port": url.port,
    "database": url.path.lstrip("/"),
    "ssl_ca": os.path.join(os.path.dirname(__file__), "ca.pem"),
    "use_pure": True
}

try:
    connection_pool = pooling.MySQLConnectionPool(
        pool_name="mockmarket_pool",
        pool_size=5,
        **dbconfig
    )
    print("✅ Connection pool created successfully!")
except Exception as e:
    print("❌ Error creating pool:", e)

def get_connection():
    """Get a connection from the pool"""
    return connection_pool.get_connection()
