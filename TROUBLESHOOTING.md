# Timeout & Performance Troubleshooting

## Problem: Frontend timeout errors on stock movers endpoints

### Symptoms

- Console errors: "timeout of 8000ms exceeded"
- Affects `/stocks/top-gainers`, `/stocks/top-losers`, `/stocks/most-active`
- Axios errors in `stockMoversApi.ts` and `useMovers.ts`

### Root Causes & Solutions

#### 1. Missing Dependencies (FIXED ✅)

**Cause:** Backend missing `feedparser` dependency  
**Symptom:** Backend fails to start with `ModuleNotFoundError: No module named 'feedparser'`  
**Solution:**

```powershell
cd backend
pip install feedparser
# OR install all deps from updated requirements.txt
pip install -r requirements.txt
```

#### 2. Frontend Timeout Too Short (FIXED ✅)

**Cause:** Axios timeout was 8s, but stock queries can take 10-15s with large datasets  
**Solution:** Increased to 20s in `frontend/src/lib/http.ts`

#### 3. Missing Database Indexes (ACTION NEEDED)

**Cause:** Stock_Prices table has no indexes on commonly queried columns  
**Symptom:** Slow queries (5-15s) when stock count is >1000  
**Solution:**

```powershell
# From backend/ directory
mysql -u your_user -p your_database < db_indexes.sql
```

This creates indexes on:

- `Stock_Prices(stock_id, as_of)` - For latest price lookups
- `Stock_Prices(day_open)` - For intraday calculations
- `Stock_Prices(prev_close)` - For day-over-day calculations
- `Stock_Prices(day_high, day_low)` - For volatility/most-active
- `Stocks(exchange, stock_id)` - For exchange filtering

**Expected speedup:** 5-15s → <1s for typical queries

#### 4. Backend Not Running

**Symptom:** Connection refused or no response  
**Solution:**

```powershell
cd backend
python app.py
# Should see: "Flask app initialized in X.XXs"
# Server runs at http://localhost:5000
```

#### 5. Large Dataset Performance

**Current behavior:** Queries scan all stocks in Stock_Prices  
**Optimization options:**

1. **Add indexes** (see #3 above) - MOST IMPORTANT
2. **Limit data retention:** Keep only last 7 days of price history
3. **Partition by date:** Split Stock_Prices by month/quarter
4. **Add caching:** Redis/Memcached for top movers results (5-10min TTL)

## Verification Steps

### 1. Check backend is running and healthy

```powershell
curl http://localhost:5000/healthz
# Should return: {"status": "ok", "db": true, ...}
```

### 2. Test stock endpoints directly

```powershell
curl "http://localhost:5000/stocks/top-gainers?limit=5"
# Should return JSON with 5 stocks in <1s (with indexes)
```

### 3. Check metrics

```powershell
curl http://localhost:5000/metrics
# Shows Upstox API call counts and rate limits
```

### 4. Monitor query performance

```sql
-- In MySQL, check slow queries
SHOW FULL PROCESSLIST;

-- Check if indexes exist
SHOW INDEX FROM Stock_Prices;
SHOW INDEX FROM Stocks;
```

## Quick Fixes Applied

✅ **Frontend timeout:** 8s → 20s  
✅ **Added feedparser** to requirements.txt  
✅ **Created db_indexes.sql** with performance indexes  
✅ **Created standalone runners** (`run_stock_fetcher.py`, `run_index_fetcher.py`)  
✅ **Added minimal requirements** (`requirements.minimal.txt`) for clean installs

## Next Steps (Recommended)

1. **Install DB indexes** (biggest performance win)
2. **Monitor /metrics endpoint** to ensure Upstox rate limits are OK
3. **Consider WebSocket** for real-time updates instead of REST polling
4. **Add response caching** for top movers (reduces DB load)

## Performance Benchmarks (Expected)

| Metric                | Before Indexes | After Indexes |
| --------------------- | -------------- | ------------- |
| Top Gainers Query     | 5-15s          | <1s           |
| Most Active Query     | 8-20s          | <1s           |
| DB CPU Usage          | 40-80%         | <10%          |
| Frontend Timeout Rate | 50-80%         | <1%           |

## File Changes Summary

```
backend/
  requirements.txt           # Added feedparser==6.0.11
  requirements.minimal.txt   # NEW: Clean minimal deps
  db_indexes.sql            # NEW: Performance indexes
  run_stock_fetcher.py      # NEW: Standalone stock fetcher
  run_index_fetcher.py      # NEW: Standalone index fetcher
  README.md                 # Added DB performance & fetcher docs

frontend/
  src/lib/http.ts           # Timeout: 8000 → 20000ms
```
