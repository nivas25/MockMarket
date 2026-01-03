# MockMarket

Full-stack mock trading platform with a Flask backend and Next.js frontend.

- **Backend (Flask)**: Market data, movers, indices, orders, watchlists, auth, websockets. See [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md).
- **Frontend (Next.js 16)**: Dashboard, stock detail pages, movers, news/sentiment, order panels.

## Repo layout

- `backend/` Flask API, schedulers, DB access, websocket manager
- `frontend/` Next.js app (App Router)

## Quick start (local)

```bash
# backend
cd backend
cp .env.example .env
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
pip install -r requirements.txt
python app.py  # http://localhost:5000

# frontend (new shell)
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev  # http://localhost:3000
```

## Environment

- Backend vars: `backend/.env.example` (JWT secret, DB creds, CORS origins, scheduler toggles, OAuth, Upstox token).
- Frontend vars: `frontend/.env.local.example` (`NEXT_PUBLIC_API_URL`, Google client ID).

## Deployment notes

- Backend: gunicorn-friendly (see `backend/gunicorn.conf.py`), Render template in `backend/render.yaml`; set `ALLOWED_ORIGINS` and strong `JWT_SECRET_KEY`.
- Frontend: standard Next.js build (`npm run build` / `npm start`) pointing `NEXT_PUBLIC_API_URL` to your backend.

## Optional tuning

- DB performance indexes: `backend/db_indexes.sql`.
- Slow-request threshold: `PERF_LOG_THRESHOLD_MS` (backend env).
- Cache toggles and live price overlay controlled via env flags in backend.

## Screenshots

<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183311.png" alt="Dashboard" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183323.png" alt="Dashboard widgets" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183337.png" alt="Watchlist" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183352.png" alt="Portfolio" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183407.png" alt="Holdings" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183418.png" alt="Positions" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183432.png" alt="Orders" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183441.png" alt="Order detail" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20183500.png" alt="Search stocks" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20211054.png" alt="Stock detail" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20211130.png" alt="Live chart" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20211139.png" alt="Depth view" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20211800.png" alt="Indices" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20211825.png" alt="Movers" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20211849.png" alt="Top gainers" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20211906.png" alt="Top losers" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20212005.png" alt="Sentiment" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20212220.png" alt="News feed" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20212306.png" alt="Watchlist alt" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20212322.png" alt="Orders alt" width="48%" />
</p>
<p align="center">
	<img src="frontend/public/pages/Screenshot%202026-01-03%20212338.png" alt="Portfolio alt" width="48%" />
	<img src="frontend/public/pages/Screenshot%202026-01-03%20212411.png" alt="Positions alt" width="48%" />
</p>
