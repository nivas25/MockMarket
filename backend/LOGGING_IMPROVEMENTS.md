# Logging Configuration - Production Ready

## ✅ Changes Made

### 1. **Centralized Logging Configuration**

- Created `utils/logging_config.py` with structured logging setup
- Configured rotating file handler (10MB max, 5 backups)
- Added environment-based log level control
- **Fixed Windows console encoding** - UTF-8 support for emojis and special characters

### 2. **Environment Variables**

Updated `.env.example`:

```bash
LOG_LEVEL=INFO              # DEBUG | INFO | WARNING | ERROR | CRITICAL
PERF_LOG_THRESHOLD_MS=500   # Only log requests slower than this
DEBUG_SOCKET=false          # Disable verbose Socket.IO logs in production
DEBUG_CACHE=false           # Set to true to see cache hit/miss logs (DEBUG mode only)
DB_POOL_SIZE=15             # Increased from 5 for production
```

### 3. **Market Hours Restored**

- Reverted to production hours: **9:15 AM - 3:30 PM IST**
- Re-enabled weekday checks (no trading on weekends)
- Removed testing configuration

### 4. **Logging Levels by Module**

| Module                   | Log Level | Purpose                                       |
| ------------------------ | --------- | --------------------------------------------- |
| `app.py`                 | INFO      | Server startup, initialization                |
| `db_pool.py`             | INFO      | Connection pool status                        |
| `market_hours.py`        | INFO      | Market status changes                         |
| `websocket_manager.py`   | DEBUG     | Client connections (only in DEBUG mode)       |
| `cache_service.py`       | DEBUG     | Cache operations (only when DEBUG_CACHE=true) |
| `hot_cache_scheduler.py` | INFO      | Cache scheduler lifecycle                     |
| `services/*`             | INFO      | Service lifecycle, errors                     |
| `controller/*`           | WARNING   | Only warnings and errors                      |
| Third-party libs         | WARNING   | Reduce noise                                  |

### 5. **Cache Logging**

- Cache hit/miss logs **only appear when `DEBUG_CACHE=true`**
- Prevents log spam in production (cache operations happen every few seconds)
- Use `DEBUG_CACHE=true` only when debugging cache issues

### 5. **Performance Monitoring**

- Increased threshold from 300ms to **500ms**
- Only logs slow requests to reduce log volume
- Keeps `Server-Timing` header for browser DevTools

## 🚀 Usage

### Development

```bash
# .env
LOG_LEVEL=DEBUG
DEBUG_SOCKET=true
DEBUG_CACHE=true   # See cache operations
PERF_LOG_THRESHOLD_MS=300
```

### Production

```bash
# .env
LOG_LEVEL=INFO
DEBUG_SOCKET=false
DEBUG_CACHE=false  # Hide cache noise
PERF_LOG_THRESHOLD_MS=500
```

### Staging

```bash
# .env
LOG_LEVEL=DEBUG  # More verbose for debugging
DEBUG_SOCKET=false
PERF_LOG_THRESHOLD_MS=500
```

## 📁 Log Files

Logs are stored in `backend/logs/`:

- `mockmarket.log` - Current log file
- `mockmarket.log.1` - Rotated backup (most recent)
- `mockmarket.log.2-5` - Older backups

## 🔍 Log Format

```
2025-11-03 16:30:45 | INFO     | app:105 | Flask app initialized in 1.74s
2025-11-03 16:30:45 | INFO     | db_pool:58 | Connection pool ready in 9.03s (15 connections)
2025-11-03 16:30:55 | WARNING  | app:72 | Slow request: 523ms GET /stocks/history/PAYTM -> 200
2025-11-03 16:31:00 | ERROR    | services.stock_service:142 | Failed to fetch stock prices: Connection timeout
```

Format: `timestamp | level | module:line | message`

## 🛠️ Next Steps (Future Improvements)

### Not Yet Implemented (Low Priority):

1. **Remove remaining print() statements** in:

   - `controller/order/buy_sell_order.py` (~20 print statements)
   - `services/index_websocket.py` (debug prints)
   - `services/stock_service_scheduler.py` (console.log statements)

2. **Add structured logging** with JSON format for production:

   ```python
   import logging.config
   import json_log_formatter
   ```

3. **Integrate error tracking** (Sentry):

   ```python
   import sentry_sdk
   sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"))
   ```

4. **Add request ID tracking** for tracing:
   ```python
   import uuid
   g.request_id = str(uuid.uuid4())
   ```

## ✅ Benefits

1. **Production Ready**

   - Appropriate log levels for production
   - No verbose debug output flooding logs
   - Structured format for log aggregation tools

2. **Performance**

   - Reduced I/O from excessive logging
   - Only logs important events
   - Configurable thresholds

3. **Debugging**

   - Easy to switch to DEBUG mode when needed
   - Rotating logs prevent disk fill-up
   - Clear timestamp and module information

4. **Monitoring**
   - Can be integrated with ELK stack, Splunk, DataDog
   - Machine-parseable format
   - Request performance tracking

## 📊 Impact

**Before:**

- 100+ print() statements throughout codebase
- All logs at same level
- No rotation (disk fill risk)
- Difficult to filter important events
- Testing configuration in production code

**After:**

- Centralized logging configuration
- Appropriate log levels (DEBUG/INFO/WARNING/ERROR)
- Automatic log rotation (10MB files)
- Production-ready market hours
- Easy to adjust verbosity via environment variables

## 🔧 Manual Steps Required

To complete the transition:

1. **Add to your .env file:**

   ```bash
   LOG_LEVEL=INFO
   PERF_LOG_THRESHOLD_MS=500
   DB_POOL_SIZE=15
   ```

2. **Create logs directory:**

   ```bash
   mkdir backend/logs
   ```

3. **Restart backend server** to apply changes

4. **Verify logging works:**
   ```bash
   tail -f backend/logs/mockmarket.log
   ```

That's it! Your logging is now production-ready! 🎉
