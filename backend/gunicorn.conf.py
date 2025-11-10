# Gunicorn Configuration for Render Production Deployment
# Optimized for Render free tier (512MB RAM, 0.1 CPU)

import multiprocessing
import os

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
backlog = 2048

# Worker processes
# Free tier: Use 1 worker to stay within memory limits
# For paid tier: Uncomment the multiprocessing line
workers = 1
# workers = multiprocessing.cpu_count() * 2 + 1

# Use gevent for async WebSocket support
worker_class = "gevent"
worker_connections = 1000

# Threading
threads = 1

# Timeouts
timeout = 120  # Allow 2 minutes for slow DB queries
graceful_timeout = 30
keepalive = 5

# Restart workers after this many requests (prevent memory leaks)
max_requests = 1000
max_requests_jitter = 50

# Logging
accesslog = "-"  # Log to stdout (Render captures this)
errorlog = "-"   # Log errors to stdout
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "mockmarket-backend"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Preload app for faster worker spawn
preload_app = True

# Server hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    print("🚀 Starting MockMarket backend...")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    print("🔄 Reloading workers...")

def when_ready(server):
    """Called just after the server is started."""
    print("✅ MockMarket backend is ready!")

def worker_exit(server, worker):
    """Called just after a worker has been exited."""
    print(f"⚠️ Worker {worker.pid} exited")
