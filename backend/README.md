# MockMarket Backend

Fast Flask API for market data aggregation and auth.

## Setup

1. Create and fill in `.env` from the example:

   - Windows PowerShell

     Copy `.env.example` to `.env` and set values.

2. Create a virtual environment and install deps:

   - Use the existing `backend_venv` locally or create one:

   ```powershell
   python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.minimal.txt
   ```

3. Run the server:

```powershell
python app.py
```

Server runs at http://localhost:5000

## Database Performance

For optimal query performance on stock movers endpoints, run the included DB indexes:

```powershell
# From backend/ directory
mysql -u your_user -p your_database < db_indexes.sql
```

This creates indexes on `Stock_Prices` and `Stocks` tables that significantly speed up top-gainers/losers/most-active queries.

## Standalone Data Fetchers

If you want to run the data fetchers separately from the Flask app:

```powershell
# Stock prices fetcher (every 120s)
python run_stock_fetcher.py

# Index prices fetcher (every 120s, or specify interval)
python run_index_fetcher.py [interval_seconds]
```

These must be run from the `backend/` directory root.

## Environment Variables

See `.env.example` for all options. Key ones:

- JWT_SECRET_KEY
- DATABASE_URI (e.g. mysql+mysqlconnector://user:pass@host:3306/dbname)
- or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME (fallback if DATABASE_URI not set)
- ENABLE_INDEX_SCHEDULER (false/true)
- INDEX_FETCH_INTERVAL (seconds)
- ENABLE_STOCK_SCHEDULER (false/true) — defaults to true
- STOCK_FETCH_INTERVAL (seconds) — defaults to 120
- GOOGLE_CLIENT_ID
- UPSTOX_ACCESS_TOKEN
- RSS_TIMEOUT_SECONDS

## Health Check

- `GET /healthz` — returns JSON with overall status and DB connectivity indicator.

## Notes

- Use a production WSGI server for deployment (e.g., gunicorn/waitress) and configure proper CORS and TLS.
- Avoid committing virtual environments; see the root `.gitignore`.
