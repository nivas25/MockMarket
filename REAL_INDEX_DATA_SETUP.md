# Real Index Data Integration - Setup & Testing Guide

## ✅ Implementation Complete!

All components for real-time index data have been created. Follow this guide to test everything.

---

## 📁 Files Created/Modified

### Backend Files:

1. ✅ `backend/controller/fetch/index_fetch/fetch_indices.py` - Index fetcher script
2. ✅ `backend/controller/fetch/index_fetch/runner_fetch_indices.py` - Runner script
3. ✅ `backend/routes/fetch_routes/index_fetch_routes.py` - API routes
4. ✅ `backend/app.py` - Updated to register index routes
5. ✅ `backend/.env.example` - Environment variables template

### Frontend Files:

1. ✅ `frontend/src/services/api/indexApi.ts` - API client
2. ✅ `frontend/src/components/dashboard/IndicesStrip.tsx` - Updated with real data + View All link
3. ✅ `frontend/src/components/dashboard/IndicesStrip.module.css` - Updated with header styles
4. ✅ `frontend/src/app/dashboard/indices/page.tsx` - All indices page
5. ✅ `frontend/src/app/dashboard/indices/AllIndices.module.css` - All indices page styles
6. ✅ `frontend/.env.example` - Frontend environment variables
7. ✅ `frontend/package.json` - Fixed Turbopack issue

### Database:

✅ `Index_Prices` table created (you already did this!)

---

## 🚀 Step-by-Step Testing Instructions

### **Step 1: Verify Database Table**

Check that your `Index_Prices` table exists:

```sql
SHOW TABLES LIKE 'Index_Prices';
DESCRIBE Index_Prices;
```

Expected columns:

- id, index_name, instrument_key, ltp, open_price, high_price, low_price, prev_close, change_value, change_percent, tag, last_updated

---

### **Step 2: Set Up Backend Environment**

Make sure your `backend/.env` file has:

```env
UPSTOX_ACCESS_TOKEN=your_actual_token
DB_HOST=localhost
curl http://localhost:5000/indices/all
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET_KEY=your_secret_key
```

---

### **Step 3: Start the Index Fetcher**

Open a **NEW terminal** in the backend directory:

```powershell
cd backend
python controller/fetch/index_fetch/runner_fetch_indices.py
```

**Expected Output:**

```
[📊] Fetching 12 index quotes from Upstox...
[✅] Successfully fetched index data
[+] Updated NIFTY 50: 23,450.75 (+0.54%)
[+] Updated SENSEX: 76,180.50 (+0.91%)
[+] Updated BANKNIFTY: 48,989.15 (-0.12%)
[+] Updated INDIA VIX: 12.30 (+1.50%)
curl http://localhost:5000/indices/all
[✅] Successfully updated 12 indices
[⏰] Next update in 120 seconds...
```

**If you see errors:**

- ❌ "UPSTOX_ACCESS_TOKEN not set" → Check your `.env` file
- ❌ "No data received from Upstox" → Check your API token validity
- ❌ Database errors → Verify table creation and credentials

**Keep this terminal running!** The fetcher updates every 2 minutes.

---

### **Step 4: Start Flask Backend**

Open **ANOTHER terminal** for the Flask API:

```powershell
cd backend
python app.py
```

**Expected Output:**

```
 * Running on http://127.0.0.1:5000
```

---

### **Step 5: Test Backend API Endpoints**

Open a **third terminal** or use your browser:

**Test 1: Get All Indices**

```powershell
curl http://localhost:5000/indices/all
```

**Expected Response:**

```json
{
  "status": "success",
  "data": [
    {
      "name": "NIFTY 50",
      "value": "23,450.75",
      "change": "+0.54%",
      "direction": "up",
      "tag": "Benchmark",
      "lastUpdated": "2025-10-27T10:30:00"
    },
    ...
  ],
  "count": 4
}
```

**Test 2: Get All Indices**

```powershell
curl http://localhost:5000/indices/all
```

**Expected Response:**

```json
{
  "status": "success",
  "data": {
    "Benchmark": [...],
    "Banking": [...],
    "Volatility": [...],
    "Sectoral": [...],
    "Broader Market": [...]
  },
  "totalIndices": 12
}
```

**Test 3: Get Specific Index**

```powershell
curl http://localhost:5000/indices/NIFTY%2050
```

---

### **Step 6: Set Up Frontend Environment**

Create `frontend/.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

### **Step 7: Start Frontend**

```powershell
cd frontend
npm run dev
```

**Expected Output:**

```
> next dev --turbopack=false
✓ Ready on http://localhost:3000
```

Note: Turbopack is now disabled to fix the panic error!

---

### **Step 8: Test Frontend**

1. **Open Browser:** http://localhost:3000/dashboard

2. **Check Dashboard Indices Strip:**

   - You should see 4 real indices with live data
   - Green/red pills showing +/- changes
   - "View All →" link on the right

3. **Click "View All →":**

   - Should navigate to `/dashboard/indices`
   - See all 12 indices grouped by category
   - Each card shows OHLC data (Open, High, Low, Prev Close)

4. **Wait 30 seconds:**
   - Data should auto-refresh (check browser console for fetch logs)

---

## 🔍 Troubleshooting

### **Problem: No data in frontend**

**Check:**

1. Is the index fetcher running? (Terminal 1)
2. Is Flask API running? (Terminal 2)
3. Is there data in database?
   ```sql
   SELECT * FROM Index_Prices LIMIT 5;
   ```
4. Open browser DevTools → Network tab → Check API calls

---

### **Problem: "Failed to fetch indices"**

**Fix:**

1. Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
2. Make sure Flask is running on port 5000
3. Check browser console for CORS errors
4. Verify JWT token in localStorage (if using auth)

---

### **Problem: Index fetcher shows "No data received from Upstox"**

**Fix:**

1. Verify `UPSTOX_ACCESS_TOKEN` is correct
2. Check token hasn't expired (Upstox tokens expire daily)
3. Try regenerating token from Upstox API console
4. Check if market is open (9:15 AM - 3:30 PM IST, Mon-Fri)

---

### **Problem: Database connection errors**

**Fix:**

1. Check MySQL is running
2. Verify database credentials in backend `.env`
3. Test connection:
   ```python
   from db_pool import get_connection
   conn = get_connection()
   print("Connected!")
   ```

---

## 📊 Database Queries for Debugging

**Check if data is being inserted:**

```sql
SELECT index_name, ltp, change_percent, last_updated
FROM Index_Prices
ORDER BY last_updated DESC;
```

**Check update frequency:**

```sql
SELECT index_name,
       last_updated,
       TIMESTAMPDIFF(SECOND, last_updated, NOW()) as seconds_ago
FROM Index_Prices;
```

**Clear all data (if needed):**

```sql
TRUNCATE TABLE Index_Prices;
```

---

## 🎯 What You Should See

### **Dashboard (http://localhost:3000/dashboard)**

- ✅ Top 4 indices with real values
- ✅ Live green/red dots
- ✅ Percentage changes
- ✅ "View All →" link in top right

### **All Indices Page (http://localhost:3000/dashboard/indices)**

- ✅ "← Back to Dashboard" link
- ✅ "All Market Indices" title
- ✅ 5 category sections:
  - Benchmark (NIFTY 50, SENSEX)
  - Banking (BANKNIFTY)
  - Volatility (INDIA VIX)
  - Sectoral (IT, Pharma, Auto, FMCG, Metal, Realty)
  - Broader Market (Midcap 50, Smallcap 50)
- ✅ Each card shows: Name, Current Price, Open, High, Low, Prev Close, Change

---

## ⏰ Auto-Refresh Behavior

- **Backend Fetcher:** Fetches from Upstox every **2 minutes**
- **Frontend:** Fetches from backend every **30 seconds**
- **Database:** Always has latest data (max 2 minutes old)
- **User sees:** Data max 30 seconds old

**Total API Calls to Upstox:**

- 30 calls/hour (every 2 min)
- 720 calls/day (24 hours)
- Only **0.06%** of your rate limit (500/min) ✅

---

## 🎉 Success Criteria

You're done when:

1. ✅ Index fetcher runs without errors
2. ✅ API endpoints return real data
3. ✅ Dashboard shows 4 live indices
4. ✅ "View All" page shows 12 indices
5. ✅ Data auto-refreshes every 30 seconds
6. ✅ No console errors in browser

---

## 📝 Next Steps

After verifying everything works:

1. **Run during market hours** (9:15 AM - 3:30 PM IST) to see live changes
2. **Test on mobile** - responsive design should work
3. **Deploy backend** to Railway/Render
4. **Deploy frontend** to Vercel
5. **Set up environment variables** in deployment platforms

---

## 🆘 Need Help?

If something doesn't work, check:

1. All 3 terminals are running (fetcher, flask, next)
2. Database has data (`SELECT * FROM Index_Prices;`)
3. API returns data (`curl http://localhost:5000/indices/all`)
4. Browser console for errors (F12 → Console)
5. Network tab for failed API calls (F12 → Network)

Share the error message and I'll help debug! 🚀
