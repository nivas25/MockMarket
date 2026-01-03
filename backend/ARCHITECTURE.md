# Backend Architecture

Detailed view of how the Flask backend is structured, how requests flow, and how background services keep data fresh.

## High-level
- Flask app (`app.py`) wires blueprints for stocks, indices, auth, orders, watchlists, health/metrics, and debug.
- MySQL stores reference data (Stocks) and time-series quotes (Stock_Prices).
- Live data path: DB read → optional websocket cache overlay → JSON response.
- Background schedulers keep DB/cache warm; WebSocket server streams live prices to clients.

## Runtime composition
- **HTTP server**: Flask with CORS, compression, JWT; `socketio.run` in dev, gunicorn for prod.
- **WebSocket**: `services.websocket_manager` (Flask-SocketIO) sharing the Flask app instance.
- **DB access**: `db_pool.py` connection pool; controllers issue SQL for reads/writes.
- **Caching**:
  - In-memory cache via `services.cache_service` for hot endpoints (movers, news, sentiment).
  - Optional live price cache via `services.live_price_cache` (fed by websocket or fetchers).

## Request flows (core)
- **Stock detail** `GET /stocks/detail/<symbol>` ([routes/fetch_routes/stock_price_fetch_routes.py](routes/fetch_routes/stock_price_fetch_routes.py))
  - Fetch latest DB row for symbol (joins Stocks + latest Stock_Prices).
  - If market hours and live cache present: overlay LTP/OHLC from `get_day_ohlc`; recompute change %.
  - `forceLive=1` can call Upstox live price as fallback.
  - Responds with source flag (`database`, `websocket_cache`, `upstox_api`).
- **Top movers** `GET /stocks/movers-all` and related gainers/losers/active endpoints
  - Query latest `Stock_Prices` snapshot with computed change percent/value.
  - Optionally overlay live prices when websocket cache is enabled.
  - Results cached briefly (10s) in `cache_service` to reduce DB load.
- **Indices** `GET /indices/*`
  - Similar pattern: latest DB snapshot, short cache, optional live overlay (if configured).
- **Orders & watchlists** `routes/order_routes/*`, `routes/watchlist_routes/*`
  - Use JWT auth; simple MySQL CRUD via controllers.
- **Auth** `routes/google_auth_routes/auth_routes.py`
  - Google OAuth token exchange; issues JWT via Flask-JWT-Extended.
- **Health/metrics** `GET /healthz`, `GET /metrics`
  - Health pings DB; metrics expose counters/timings for monitoring.

## Background services
- Initialized in `initialize_services()` in `app.py` (called on startup):
  - DB pool warmup.
  - Optional startup refresh of stale prices (`_maybe_refresh_prices_on_start`).
  - **Index scheduler** `services/index_service_scheduler.py` (guarded by `ENABLE_INDEX_SCHEDULER`).
  - **Stock scheduler** `services/stock_service_scheduler.py` (guarded by `ENABLE_STOCK_SCHEDULER`).
  - **Hot cache refresher** `services/hot_cache_scheduler.py` to pre-warm frequent queries.
  - **EOD candle scheduler** `services/eod_candle_scheduler.py` (optional end-of-day tasks).
- Schedulers typically run periodic fetches via controllers and write into the DB; caches are refreshed alongside.

## Websocket & live prices
- `services.websocket_manager.py` sets up Socket.IO; clients receive live ticks.
- `services.live_price_cache.py` keeps an in-memory map of latest prices/OHLC per stock_id for quick overlay in HTTP responses.
- Market-hours gating logic in `utils/market_hours.py` decides when to trust live cache vs DB.

## Modules layout (backend/)
- `app.py` — app factory, CORS, JWT, blueprints, Socket.IO, service init.
- `routes/` — HTTP blueprints:
  - `fetch_routes/stock_price_fetch_routes.py` (stocks detail, movers, search)
  - `fetch_routes/index_fetch_routes.py` (indices)
  - `news_routes.py`, `sentiment_routes.py`, `health_routes.py`, `metrics_routes.py`, `debug_routes.py`
  - auth, order, watchlist, user management blueprints.
- `controller/` — data access & business logic (fetching stock prices, orders, users, etc.).
- `services/` — schedulers, cache, websocket manager, HTTP client wrappers, live price cache.
- `utils/` — logging config, market hours checks, request validators, pretty logging helpers.
- `db_indexes.sql` — optional performance indexes for Stock_Prices/Stocks.
- `Diagrams/` — DOT files describing high-level and monolith architectures.

## Configuration & env
- Template: `backend/.env.example` documents all variables.
- Core vars: `JWT_SECRET_KEY`, DB credentials (`DATABASE_URI` or DB_*), `ALLOWED_ORIGINS`, scheduler toggles, performance knobs (`DB_POOL_SIZE`, `PERF_LOG_THRESHOLD_MS`), OAuth (`GOOGLE_CLIENT_ID`), `UPSTOX_ACCESS_TOKEN`.
- Debug toggles: `DEBUG_SOCKET`, `DEBUG_CACHE` for verbose logs.

## Deployment
- Local/dev: `python app.py` (Socket.IO dev server).
- Production: gunicorn with `gunicorn.conf.py`; Socket.IO can run with gevent/eventlet depending on `SOCKETIO_ASYNC_MODE`.
- Render template provided in `render.yaml`; set env vars there and rely on platform `PORT`.

## Data freshness and performance
- Price freshness: schedulers write to DB; live cache overlays during market hours; `forceLive` hits upstream API as a last resort.
- Response caching: short TTL in-memory caches for heavy read endpoints (movers, news, sentiment, indices).
- Slow-request logging: `PERF_LOG_THRESHOLD_MS` controls warning threshold; Server-Timing header added per request.
