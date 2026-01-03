# MockMarket Frontend

Next.js 16 (App Router) UI for browsing stocks, movers, news, sentiment, and placing simulated orders against the Flask backend.

## Quick start
1) Copy env template and fill values:
```bash
cd frontend
cp .env.local.example .env.local
```

2) Install deps:
```bash
npm install
```

3) Run dev server (http://localhost:3000):
```bash
npm run dev
```

## Configuration
- API base URL comes from `NEXT_PUBLIC_API_URL` (see `.env.local.example`).
- Shared axios client: `src/lib/http.ts` uses `src/config.js`, injects `Authorization: Bearer <token>` from `localStorage`, and logs errors.
- Google OAuth: `NEXT_PUBLIC_GOOGLE_CLIENT_ID` if enabling auth flows.

## Notable features
- Stock detail pages at `/stocks/[symbol]` calling backend `/stocks/detail/<symbol>`.
- Movers page uses aggregated `/stocks/movers-all` for gainers/losers/active in one request.
- SWR hooks for polling/caching: `src/hooks` (movers, news, sentiment, live stats).
- Charts with `lightweight-charts` and `recharts`; UI icons via `lucide-react`.

## Build and preview
```bash
npm run build
npm start
```

## Project layout (frontend/)
- `src/app` routes (App Router), layouts, error/loading states
- `src/components` shared UI, dashboard pieces
- `src/services/api` typed API clients
- `src/hooks` data-fetching hooks (SWR)
- `src/lib` axios client and helpers
- `public/` static assets
