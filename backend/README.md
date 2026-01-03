# MockMarket Backend

Flask API for market data, trading simulation, and auth. Serves stock details, movers, indices, orders, watchlists, and health/metrics endpoints.

## Quick start
1) Copy env template and fill values:
```powershell
cd backend
copy .env.example .env
```

2) Create venv and install:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

3) Run dev server (default http://localhost:5000):
```powershell
python app.py
```

## Environment
- See `.env.example` for full list.
- Required: `JWT_SECRET_KEY`, DB creds (`DATABASE_URI` or DB_*), `ALLOWED_ORIGINS`.
- Optional: schedulers `ENABLE_STOCK_SCHEDULER`, `ENABLE_INDEX_SCHEDULER`, tuning `DB_POOL_SIZE`, `PERF_LOG_THRESHOLD_MS`, OAuth (`GOOGLE_CLIENT_ID`), Upstox token.

## Database
- MySQL schema with `Stocks` and `Stock_Prices` tables.
- Apply performance indexes:
```powershell
mysql -u <user> -p <db> < db_indexes.sql
```

## Key endpoints (high level)
- `GET /stocks/detail/<symbol>` stock detail with optional live overlay.
- `GET /stocks/movers-all` aggregated gainers/losers/active.
- `GET /indices/*`, `GET /news/*`, `GET /sentiment/*`.
- Auth: Google OAuth under `/auth`; JWT middleware via Flask-JWT-Extended.
- Health/metrics: `/healthz`, `/metrics`.

## Background services
- Socket.IO for live prices; hot cache refresher; stock/index schedulers (guarded by env flags); optional EOD candle job.

## Deployment notes
- Production WSGI: gunicorn (see `gunicorn.conf.py`).
- CORS allowlist via `ALLOWED_ORIGINS`.
- Render config in `render.yaml`.

## Project layout (backend/)
- `app.py` entrypoint and blueprint wiring
- `routes/` HTTP endpoints (stocks, indices, auth, watchlist, orders, health, metrics)
- `services/` schedulers, cache, websocket, HTTP client wrappers
- `controller/` data access and business logic
- `utils/` logging, market hours, validators
- `db_indexes.sql` optional DB tuning
- `Diagrams/` DOT architecture diagrams
