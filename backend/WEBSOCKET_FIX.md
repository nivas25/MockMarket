# WebSocket Fix - Install Required Dependencies

## Issue

The error `AssertionError: write() before start_response` happens because Flask-SocketIO needs an async server (eventlet or gevent) to properly handle WebSocket connections.

## Solution

### 1. Install Required Dependencies

Open PowerShell in the backend directory and run:

```powershell
cd C:\Users\reddy\Desktop\mock_market\MockMarket\backend
.\.venv\Scripts\python.exe -m pip install eventlet==0.36.1 certifi==2024.8.30
```

Or activate the virtual environment first:

```powershell
cd C:\Users\reddy\Desktop\mock_market\MockMarket\backend
.\.venv\Scripts\Activate.ps1
pip install eventlet==0.36.1 certifi==2024.8.30
```

### 2. What Changed

**File: `services/websocket_manager.py`**

- Changed `async_mode="threading"` → `async_mode="eventlet"`
- This tells Flask-SocketIO to use eventlet for WebSocket support

**File: `requirements.minimal.txt`**

- Added `eventlet==0.36.1` (async server for WebSocket)
- Added `certifi==2024.8.30` (SSL certificate bundle)

### 3. Restart the Backend

After installing, restart your backend:

```powershell
python app.py
```

You should see:

```
✅ Flask app initialized in X.XXs
 * Serving Flask-SocketIO app "app"
 * Running on http://0.0.0.0:5000
```

### 4. Test the Connection

Open your browser DevTools Console (F12) while on the frontend, you should see:

```
[socket] connected <socket-id>
```

Instead of connection errors.

## Why This Works

- **Werkzeug's dev server** (default Flask server) doesn't support WebSocket protocol
- **Eventlet** is an async networking library that provides:
  - WebSocket transport support
  - Non-blocking I/O
  - Green threads for concurrent connections
- **Flask-SocketIO** detects eventlet and uses it for WebSocket handling

## Alternative: Use gevent instead

If you prefer gevent over eventlet:

```powershell
pip install gevent==24.2.1 gevent-websocket==0.10.1
```

Then change `async_mode="eventlet"` to `async_mode="gevent"` in `services/websocket_manager.py`.

## Troubleshooting

### Still getting errors?

1. **Check eventlet installed:**

   ```powershell
   python -c "import eventlet; print(eventlet.__version__)"
   ```

   Should print: `0.36.1`

2. **Check Flask-SocketIO version:**

   ```powershell
   python -c "import flask_socketio; print(flask_socketio.__version__)"
   ```

   Should print: `5.4.1` or similar

3. **Verify async mode:**
   Check the startup logs - you should see:
   ```
   * Serving Flask-SocketIO app "app"
   ```
   NOT:
   ```
   * Running on http://127.0.0.1:5000/ (Press CTRL+C to quit)
   ```

### Frontend still can't connect?

1. Check CORS settings in `services/websocket_manager.py`
2. Verify frontend URL in `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
3. Check browser console for connection errors

## Quick Test

Once installed, test the WebSocket connection:

1. Start backend: `python app.py`
2. Open browser: http://localhost:3000/dashboard
3. Open DevTools Console (F12)
4. You should see: `[socket] connected <some-id>`
5. During market hours, you'll see live updates in the indices strip

## Summary

✅ Install eventlet and certifi  
✅ Restart backend  
✅ Check console for `[socket] connected`  
✅ Live updates should now work!
