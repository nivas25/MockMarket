"""
Database Connection Pool Manager
Manages MySQL connection pooling with automatic failover and health monitoring
"""
import os
import logging
import time
from typing import Optional
from contextlib import contextmanager
from dotenv import load_dotenv
import mysql.connector
from mysql.connector import pooling, Error
import urllib.parse as urlparse

load_dotenv()
logger = logging.getLogger(__name__)

# Connection pool instance
connection_pool: Optional[pooling.MySQLConnectionPool] = None
_pool_stats = {"connections_created": 0, "connections_failed": 0, "last_error": None}


def _parse_database_config() -> dict:
    """
    Parse database configuration from environment variables
    Supports both DATABASE_URI and individual DB_* env vars
    """
    db_uri = os.getenv("DATABASE_URI")
    
    if db_uri:
        try:
            url = urlparse.urlparse(db_uri)
            config = {
                "user": url.username,
                "password": url.password,
                "host": url.hostname,
                "port": url.port or 3306,
                "database": (url.path or "").lstrip("/"),
            }
        except Exception as e:
            logger.error(f"Failed to parse DATABASE_URI: {e}")
            raise ValueError("Invalid DATABASE_URI format") from e
    else:
        # Fallback to discrete env vars
        config = {
            "user": os.getenv("DB_USER"),
            "password": os.getenv("DB_PASSWORD"),
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", "3306")),
            "database": os.getenv("DB_NAME"),
        }
    
    # Validate required fields
    required_fields = ["user", "password", "host", "database"]
    missing = [f for f in required_fields if not config.get(f)]
    if missing:
        raise ValueError(f"Missing required database config: {', '.join(missing)}")
    
    # Add SSL and connection settings
    ssl_ca_path = os.path.join(os.path.dirname(__file__), "ca.pem")
    if os.path.exists(ssl_ca_path):
        config["ssl_ca"] = ssl_ca_path
        logger.info("SSL certificate found, enabling SSL connection")
    else:
        logger.warning("SSL certificate (ca.pem) not found, connection will not use SSL")
    
    config.update({
        "use_pure": True,
        "connection_timeout": int(os.getenv("DB_CONNECTION_TIMEOUT", "30")),  # Increased from 10 to 30 seconds
        "autocommit": os.getenv("DB_AUTOCOMMIT", "true").lower() == "true",
        "charset": "utf8mb4",
        "collation": "utf8mb4_unicode_ci",
        # Additional timeout settings for cloud databases
        "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", "30")),  # Initial connection
        "read_timeout": int(os.getenv("DB_READ_TIMEOUT", "30")),  # Read operations
        "write_timeout": int(os.getenv("DB_WRITE_TIMEOUT", "30")),  # Write operations
    })
    
    return config


def initialize_pool():
    """
    Initialize MySQL connection pool eagerly at startup
    Creates pool with configured size and validates connections
    
    Raises:
        ValueError: If database configuration is invalid
        mysql.connector.Error: If connection pool creation fails
    """
    global connection_pool, _pool_stats
    
    if connection_pool is not None:
        logger.warning("Connection pool already initialized")
        return connection_pool
    
    try:
        # Parse and validate configuration
        dbconfig = _parse_database_config()
        pool_size = int(os.getenv("DB_POOL_SIZE", "15"))
        
        logger.info(f"Initializing connection pool: {pool_size} connections to {dbconfig['host']}:{dbconfig['port']}/{dbconfig['database']}")
        
        start = time.perf_counter()
        
        # Create connection pool
        connection_pool = pooling.MySQLConnectionPool(
            pool_name="mockmarket_pool",
            pool_size=pool_size,
            pool_reset_session=True,
            **dbconfig
        )
        
        elapsed = time.perf_counter() - start
        logger.info(f"✓ Connection pool created in {elapsed:.2f}s (size={pool_size})")

        # Optional: validate a connection at startup (can block on slow networks)
        if os.getenv("DB_VALIDATE_ON_STARTUP", "false").lower() == "true":
            try:
                conn = connection_pool.get_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT VERSION(), DATABASE(), USER()")
                result = cursor.fetchone()
                logger.info(
                    f"✓ Database connection validated: MySQL {result[0]}, DB: {result[1]}, User: {result[2]}"
                )
                cursor.close()
                conn.close()
                _pool_stats["connections_created"] += 1
            except Exception as e:
                logger.error(f"✗ Pool validation failed: {e}")
                _pool_stats["connections_failed"] += 1
                _pool_stats["last_error"] = str(e)
                # Do not raise here to allow app to start; connections will be retried lazily
        
        return connection_pool
        
    except ValueError as e:
        logger.critical(f"Database configuration error: {e}")
        raise
    except Error as e:
        logger.critical(f"MySQL connection error: {e}")
        _pool_stats["last_error"] = str(e)
        raise
    except Exception as e:
        logger.critical(f"Unexpected error initializing pool: {e}")
        raise


def get_connection():
    """
    Get a connection from the pool with automatic initialization
    
    Returns:
        mysql.connector.connection.MySQLConnection: Database connection
        
    Raises:
        Exception: If connection cannot be obtained
    """
    global connection_pool, _pool_stats
    
    # Lazy initialization if pool not created
    if connection_pool is None:
        logger.warning("Pool not initialized at startup, initializing now (this may cause delay)")
        try:
            initialize_pool()
        except Exception as e:
            logger.error(f"Failed to initialize pool: {e}")
            raise Exception("Database connection pool initialization failed") from e
    
    try:
        conn = connection_pool.get_connection()
        _pool_stats["connections_created"] += 1
        return conn
    except Error as e:
        _pool_stats["connections_failed"] += 1
        _pool_stats["last_error"] = str(e)
        logger.error(f"Failed to get connection from pool: {e}")
        raise Exception("Database connection failed") from e


@contextmanager
def get_db_connection():
    """
    Context manager for database connections
    Automatically handles connection closing and error logging
    
    Usage:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM users")
            ...
    """
    conn = None
    try:
        conn = get_connection()
        yield conn
    except Exception as e:
        logger.error(f"Database operation failed: {e}")
        if conn:
            try:
                conn.rollback()
            except Exception as rollback_err:
                logger.debug(f"Rollback failed: {rollback_err}")
        raise
    finally:
        if conn:
            try:
                conn.close()
            except Exception as close_err:
                logger.debug(f"Connection close failed: {close_err}")


def get_pool_stats() -> dict:
    """
    Get connection pool statistics
    
    Returns:
        dict: Pool statistics including success/failure counts
    """
    return {
        **_pool_stats,
        "pool_initialized": connection_pool is not None,
        "pool_size": int(os.getenv("DB_POOL_SIZE", "15")) if connection_pool else 0
    }


def health_check() -> bool:
    """
    Perform health check on database connection
    
    Returns:
        bool: True if database is accessible, False otherwise
    """
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
