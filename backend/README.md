# MockMarket Backend

Fast Flask API for market data aggregation and auth.

## Setup

1. Create and fill in `.env` from the example:

   - Windows PowerShell

     Copy `.env.example` to `.env` and set values.

2. Create a virtual environment and install deps:

   - Use the existing `backend_venv` locally or create one:

   ```powershell
   python -m venv .venv; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt
   ```

3. Run the server:

```powershell
python app.py
```

Server runs at http://localhost:5000

## Environment Variables

See `.env.example` for all options. Key ones:

- JWT_SECRET_KEY
- DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
- ENABLE_INDEX_SCHEDULER (false/true)
- INDEX_FETCH_INTERVAL (seconds)
- GOOGLE_CLIENT_ID
- UPSTOX_ACCESS_TOKEN
- RSS_TIMEOUT_SECONDS

## Health Check

- `GET /healthz` — returns JSON with overall status and DB connectivity indicator.

## Notes

- Use a production WSGI server for deployment (e.g., gunicorn/waitress) and configure proper CORS and TLS.
- Avoid committing virtual environments; see the root `.gitignore`.
