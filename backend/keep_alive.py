"""
Keep-Alive Service for MockMarket Backend
Pings the backend every 5 minutes to prevent Render free tier from sleeping.

Usage:
    python keep_alive.py

Run in background (Windows):
    Start-Process -NoNewWindow python keep_alive.py

Run in background (Linux/Mac):
    nohup python keep_alive.py &
"""

import requests
import time
import logging
from datetime import datetime
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('keep_alive.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Configuration
BACKEND_URL = "https://mockmarket-backend.onrender.com/health"  # Change this to your Render URL
PING_INTERVAL = 300  # 5 minutes (in seconds)
TIMEOUT = 30  # Request timeout (in seconds)

def ping_server():
    """Send a GET request to the health endpoint."""
    try:
        start_time = time.time()
        response = requests.get(BACKEND_URL, timeout=TIMEOUT)
        elapsed_time = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            db_status = data.get('database', 'unknown')
            logger.info(
                f"✅ Server is awake | Response time: {elapsed_time:.2f}s | "
                f"DB: {db_status}"
            )
            return True
        else:
            logger.warning(
                f"⚠️ Server returned {response.status_code} | "
                f"Response time: {elapsed_time:.2f}s"
            )
            return False
            
    except requests.exceptions.Timeout:
        logger.error("❌ Request timed out (server may be waking up)")
        return False
    except requests.exceptions.ConnectionError as e:
        logger.error(f"❌ Connection failed: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        return False

def main():
    """Main loop to keep pinging the server."""
    logger.info("=" * 60)
    logger.info("MockMarket Keep-Alive Service Started")
    logger.info(f"Target URL: {BACKEND_URL}")
    logger.info(f"Ping Interval: {PING_INTERVAL} seconds ({PING_INTERVAL/60:.1f} minutes)")
    logger.info("=" * 60)
    
    consecutive_failures = 0
    
    while True:
        try:
            success = ping_server()
            
            if success:
                consecutive_failures = 0
            else:
                consecutive_failures += 1
                
            # Alert if 3 consecutive failures
            if consecutive_failures >= 3:
                logger.critical(
                    f"🚨 ALERT: {consecutive_failures} consecutive failures! "
                    f"Server may be down."
                )
            
            # Wait before next ping
            logger.info(f"Waiting {PING_INTERVAL} seconds until next ping...\n")
            time.sleep(PING_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("\n👋 Keep-Alive service stopped by user")
            break
        except Exception as e:
            logger.error(f"Unexpected error in main loop: {e}")
            time.sleep(60)  # Wait 1 minute before retrying

if __name__ == "__main__":
    main()
