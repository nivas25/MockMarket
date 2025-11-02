# 🧪 WebSocket Testing Guide (Sunday / Market Closed)

Since it's Sunday (market closed), you can test the WebSocket system using these debug endpoints!

## 🚀 Quick Test Steps

### 1. Start the Backend

```powershell
cd C:\Users\reddy\Desktop\mock_market\MockMarket\backend
.\.venv\Scripts\Activate.ps1
python app.py
```

You should see:

```
✅ Flask app initialized in X.XXs
(12345) wsgi starting up on http://0.0.0.0:5000
```

### 2. Start the Frontend

Open a **new** PowerShell terminal:

```powershell
cd C:\Users\reddy\Desktop\mock_market\MockMarket\frontend
npm run dev
```

### 3. Open Browser & Check Console

1. Go to: **http://localhost:3000/dashboard**
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. You should see: `[socket] connected abc123xyz`

✅ If you see this, WebSocket is **working**!

### 4. Test Live Updates

Keep the dashboard open, then in a **new PowerShell terminal**:

```powershell
# Test indices update
curl http://localhost:5000/debug/test-socket

# Test stock prices update
curl http://localhost:5000/debug/test-stock-prices
```

**Watch your dashboard:**

- 📊 Indices strip should update with random test values
- 💰 Numbers should change when you hit the endpoint
- 🟢 You'll see live updates without page refresh!

### 5. Automated Live Updates (Optional)

Want continuous live updates like market hours? Run this in PowerShell:

```powershell
while ($true) {
    curl http://localhost:5000/debug/test-socket
    Start-Sleep -Seconds 3
    curl http://localhost:5000/debug/test-stock-prices
    Start-Sleep -Seconds 3
}
```

Press **Ctrl+C** to stop.

## 📊 Debug Endpoints

### Check WebSocket Status

```bash
GET http://localhost:5000/debug/socket-status
```

Returns:

```json
{
  "status": "success",
  "socket_io_initialized": true,
  "async_mode": "gevent",
  "message": "Socket.IO server is ready"
}
```

### Emit Test Indices

```bash
GET http://localhost:5000/debug/test-socket
```

Emits fake data for:

- NIFTY 50
- SENSEX
- BANKNIFTY
- INDIA VIX

### Emit Test Stock Prices

```bash
GET http://localhost:5000/debug/test-stock-prices
```

Emits fake prices for:

- RELIANCE
- TCS
- INFY
- HDFCBANK
- ICICIBANK

## ✅ What to Expect

### In Browser Console (F12):

```
[socket] connected abc123xyz
```

### In Dashboard:

- 📊 Indices strip shows 4 indices
- 💰 Values update when you hit debug endpoints
- 🟢 No page refresh needed
- ⚡ Updates appear instantly

### In Backend Logs:

```
127.0.0.1 - - [02/Nov/2025 20:30:00] "GET /debug/test-socket HTTP/1.1" 200
```

## 🔍 Troubleshooting

### "Cannot connect to remote server" error?

- ✅ Backend must be running first
- ✅ Check: `python app.py` in backend terminal
- ✅ Look for: "wsgi starting up on http://0.0.0.0:5000"

### Console shows no "[socket] connected"?

- ✅ Check frontend is running (`npm run dev`)
- ✅ Check NEXT_PUBLIC_API_URL in `.env.local`
- ✅ Should be: `http://localhost:5000`

### Indices don't update?

- ✅ Open DevTools Console (F12) to see logs
- ✅ Hit the endpoint again: `curl http://localhost:5000/debug/test-socket`
- ✅ Check backend terminal for errors

### Backend crashes?

- ❌ Make sure you installed gevent: `pip install gevent==24.2.1 gevent-websocket==0.10.1`
- ❌ NOT eventlet (has Windows issues)

## 🎯 Success Criteria

✅ Backend starts without crashing  
✅ Frontend connects (console shows `[socket] connected`)  
✅ Hitting `/debug/test-socket` updates the dashboard  
✅ No page refresh needed for updates  
✅ Backend stays running (doesn't crash)

## 🎉 Once Verified

Once WebSocket works with debug endpoints:

✅ **During market hours** (Mon-Fri 9:13 AM - 3:30 PM IST):

- Schedulers will auto-start
- Real live data from Upstox will flow
- No need for debug endpoints

✅ **Outside market hours**:

- Use debug endpoints for testing
- Or populate DB: `curl http://localhost:5000/indices/refresh`

## 📝 Quick Test Command

Copy-paste this all at once:

```powershell
# Test everything
curl http://localhost:5000/debug/socket-status
Start-Sleep -Seconds 2
curl http://localhost:5000/debug/test-socket
Start-Sleep -Seconds 2
curl http://localhost:5000/debug/test-stock-prices
```

Watch the dashboard between each command - you should see live updates! 🚀
