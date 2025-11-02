# Quick Fix: Switch from eventlet to gevent (Windows compatible)

## The Issue

Eventlet has timeout issues on Windows, causing the server to crash after accepting WebSocket connections.

## Solution

### 1. Install gevent (better Windows support)

```powershell
cd C:\Users\reddy\Desktop\mock_market\MockMarket\backend
.\.venv\Scripts\Activate.ps1
pip uninstall eventlet -y
pip install gevent==24.2.1 gevent-websocket==0.10.1
```

### 2. Restart the backend

```powershell
python app.py
```

## What Changed

**File: `services/websocket_manager.py`**

- Changed `async_mode="eventlet"` → `async_mode="gevent"`

**File: `requirements.minimal.txt`**

- Removed: `eventlet==0.36.1`
- Added: `gevent==24.2.1` and `gevent-websocket==0.10.1`

## Why gevent?

- ✅ Better Windows compatibility (no timeout issues)
- ✅ Native WebSocket support via gevent-websocket
- ✅ Proven stable for production Flask-SocketIO apps
- ✅ Non-blocking I/O like eventlet

## Expected Output

After restart, you should see:

```
✅ Flask app initialized in X.XXs
✓ 📅 Index service scheduler started
✓ 📅 Stock service scheduler started
(12345) wsgi starting up on http://0.0.0.0:5000
```

**And it won't crash!** The server will stay running even after WebSocket connections.

## Test It

1. Start backend: `python app.py`
2. Open browser: http://localhost:3000/dashboard
3. Check DevTools Console (F12): `[socket] connected <id>`
4. Server stays running ✅

## Quick Command

```powershell
# All in one:
cd C:\Users\reddy\Desktop\mock_market\MockMarket\backend
.\.venv\Scripts\Activate.ps1
pip uninstall eventlet -y
pip install gevent==24.2.1 gevent-websocket==0.10.1
python app.py
```
