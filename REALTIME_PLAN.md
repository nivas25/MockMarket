# Real-Time Stock Prices - Implementation Plan

## Current State Analysis

### What You Have Now (Polling / REST)

- **Frontend:** SWR polling every 10 seconds
  - Stock movers: 3 endpoints (gainers/losers/active) → 18 requests/min per user
  - Indices: 1 endpoint → 6 requests/min per user
- **Backend:** Flask REST APIs reading from DB
  - Stock fetcher: Updates DB every 120s via Upstox REST batch calls
  - Index fetcher: Updates DB every 120s via Upstox REST batch calls
- **Latency:** 10-120 second delay for price updates
- **Real-time?** ❌ No - delayed by 10-120 seconds

---

## Option 1: Upstox WebSocket (RECOMMENDED) ⭐

### Overview

Use Upstox Market Data Feed V3 (WebSocket) for true real-time streaming.

### Architecture

```
Upstox WebSocket → Backend WS Manager → Frontend WebSocket → UI Updates
     (live)           (Python)           (React hooks)      (sub-second)
```

### Implementation Plan

#### Backend Changes

**1. Create WebSocket Manager Service** (`backend/services/upstox_websocket.py`)

```python
- Connect to wss://api.upstox.com/v3/feed/market-data-feed
- Authenticate with Bearer token
- Subscribe to instrument keys (indices + top stocks)
- Decode Protobuf messages (using MarketDataFeed.proto)
- Broadcast updates to connected frontend clients
```

**2. Add Flask-SocketIO** (for frontend WebSocket server)

```python
- Install: pip install flask-socketio simple-websocket
- Create /ws endpoint for frontend connections
- Emit real-time price updates: { symbol, ltp, change%, timestamp }
- Handle client subscribe/unsubscribe for specific symbols
```

**3. Database Strategy**

- Keep DB updates (current 120s fetcher) as **fallback only**
- Serve WebSocket data for live prices
- Use DB for historical data, charts, backtesting

#### Frontend Changes

**4. Create WebSocket Hook** (`frontend/src/hooks/useRealtimePrices.ts`)

```typescript
- Connect to ws://localhost:5000/ws (Socket.IO)
- Subscribe to symbols (e.g., NIFTY 50, RELIANCE, TCS)
- Receive live updates and update React state
- Auto-reconnect on disconnect
- Fallback to REST if WebSocket unavailable
```

**5. Update Components**

```typescript
- IndicesStrip: Use useRealtimePrices(['NIFTY 50', 'SENSEX', ...])
- StockMovers: Subscribe to top 10 gainers/losers symbols
- Remove SWR polling intervals (keep for fallback only)
```

### Upstox Limits (WebSocket V3)

- **Connections:** 2 concurrent connections per user (Normal plan)
- **Subscriptions:**
  - LTPC mode: 5,000 instrument keys (single category)
  - LTPC mode: 2,000 instrument keys (combined with other modes)
  - Full mode: 2,000 instrument keys
- **No per-second rate limits** (streaming is continuous)

### Pros ✅

- **True real-time:** Sub-second updates (tick-by-tick)
- **Efficient:** No polling overhead; push-based
- **Scalable:** One backend WS connection serves unlimited frontend clients
- **Cost-effective:** No REST rate limit concerns
- **Professional:** Industry standard for real-time market data

### Cons ❌

- **Complexity:** Requires Protobuf decoding, WebSocket state management
- **New dependencies:** flask-socketio, protobuf, websocket-client
- **Upstox Plus:** For >2000 instruments or advanced features (optional)

### Effort Estimate

- **Backend:** 4-6 hours (WS manager, Protobuf decoder, Flask-SocketIO integration)
- **Frontend:** 2-3 hours (useRealtimePrices hook, component updates)
- **Testing:** 2 hours (reconnection logic, fallback, market hours)
- **Total:** ~8-11 hours for full implementation

### Code Structure

```
backend/
  services/
    upstox_websocket.py      # WebSocket client to Upstox
    websocket_manager.py     # Flask-SocketIO server for frontend
  protos/
    MarketDataFeed.proto     # From Upstox (download)
    MarketDataFeed_pb2.py    # Generated Python classes

frontend/
  src/
    hooks/
      useRealtimePrices.ts   # WebSocket consumer hook
    lib/
      socketClient.ts        # Socket.IO client wrapper
```

---

## Option 2: Aggressive REST Polling (Quick Fix)

### Overview

Reduce polling intervals and optimize backend caching.

### Changes

- **Backend:**
  - Add Redis/in-memory cache (TTL 2-5s)
  - Reduce Upstox REST calls to every 10s (within rate limits)
  - Cache top movers queries for 5s
- **Frontend:**
  - Reduce SWR interval: 10s → 2s
  - Add optimistic updates

### Upstox Rate Limit Compliance

- Current: ~8.5 req/min (for N=1500 stocks)
- With 10s interval: ~12 req/min
- Limit: 500 req/min ✅ Still safe

### Pros ✅

- **Quick:** 1-2 hours implementation
- **Simple:** No WebSocket complexity
- **Minimal changes:** Reuse existing architecture

### Cons ❌

- **Not truly real-time:** Still 2-10s delay
- **Higher load:** More DB queries, frontend network requests
- **Inefficient:** Polling overhead vs push-based
- **Scalability issues:** Each user polls independently

### Effort Estimate

- **Backend:** 1 hour (add caching layer)
- **Frontend:** 30 mins (reduce intervals)
- **Total:** ~1.5 hours

---

## Option 3: Hybrid Approach (Best of Both) 🎯

### Overview

Combine WebSocket for critical data + REST for less urgent data.

### Implementation

- **WebSocket (real-time):**
  - Top 4 indices (NIFTY, SENSEX, BANKNIFTY, VIX)
  - Top 10 gainers/losers (subscribe to their symbols)
  - User's watchlist stocks (future feature)
- **REST Polling (slower):**
  - Market news: 120s interval (current)
  - Sentiment: 30s interval (current)
  - "Most Active" list: 30s interval (less critical)
  - Historical data, bulk queries

### Pros ✅

- **Balanced:** Real-time where it matters, efficient elsewhere
- **Incremental:** Can implement WS for indices first, expand later
- **Resource-efficient:** Limited WS subscriptions (<100 symbols)

### Cons ❌

- **Mixed complexity:** Maintain both WS and REST
- **Requires planning:** Decide what needs real-time vs polling

### Effort Estimate

- **Phase 1 (Indices only):** ~4 hours
- **Phase 2 (Top movers):** +3 hours
- **Total:** ~7 hours

---

## Recommended Path Forward

### 🚀 RECOMMENDED: Option 3 (Hybrid) - Phase 1

**Start with WebSocket for Indices only:**

1. **Week 1: Backend WebSocket Infrastructure**

   - Set up Upstox WS connection for top 4 indices
   - Add Flask-SocketIO endpoint
   - Test Protobuf decoding
   - **Deliverable:** Backend streams NIFTY/SENSEX/BANKNIFTY/VIX live

2. **Week 2: Frontend Integration**

   - Create useRealtimePrices hook
   - Update IndicesStrip to use WebSocket
   - Add fallback to REST if WS fails
   - **Deliverable:** Live ticking indices in top bar

3. **Week 3: Expand to Stock Movers**
   - Subscribe to top 10 gainers/losers symbols
   - Update stock movers components
   - **Deliverable:** Real-time stock prices across dashboard

### Implementation Checklist

#### Prerequisites

- [ ] Download Upstox MarketDataFeed.proto file
- [ ] Install protobuf compiler: `pip install protobuf`
- [ ] Generate Python classes: `protoc --python_out=. MarketDataFeed.proto`
- [ ] Install Flask-SocketIO: `pip install flask-socketio python-socketio`
- [ ] Install frontend Socket.IO client: `npm install socket.io-client`

#### Backend Tasks

- [ ] Create `backend/services/upstox_websocket.py` (Upstox WS client)
- [ ] Create `backend/services/websocket_manager.py` (Flask-SocketIO server)
- [ ] Add `/ws` endpoint in `app.py`
- [ ] Handle authentication, subscription, message decoding
- [ ] Add reconnection logic + error handling
- [ ] Test with top 4 indices first

#### Frontend Tasks

- [ ] Create `frontend/src/lib/socketClient.ts` (Socket.IO wrapper)
- [ ] Create `frontend/src/hooks/useRealtimePrices.ts`
- [ ] Update `IndicesStrip.tsx` to use WebSocket
- [ ] Add connection status indicator (live/delayed)
- [ ] Add fallback to REST polling if WS fails
- [ ] Test during market hours + off-market hours

#### Testing & Validation

- [ ] Verify <1s latency for price updates
- [ ] Test reconnection after network drop
- [ ] Test with market closed (expect no updates)
- [ ] Monitor memory leaks (long-running WS connections)
- [ ] Load test: Multiple concurrent frontend clients

---

## Cost Analysis

| Approach                      | Development Time | Latency                       | Scalability | Upstox Quota Impact    |
| ----------------------------- | ---------------- | ----------------------------- | ----------- | ---------------------- |
| **Option 1: Full WebSocket**  | 8-11 hours       | <1s                           | Excellent   | Minimal (1 connection) |
| **Option 2: Aggressive REST** | 1.5 hours        | 2-10s                         | Poor        | Moderate (12 req/min)  |
| **Option 3: Hybrid**          | 7 hours          | <1s (critical), 10-30s (rest) | Good        | Low (WS + light REST)  |

---

## My Recommendation

**Go with Option 3 (Hybrid), starting with Phase 1 (Indices WebSocket only).**

**Why:**

1. **Quick win:** See real-time indices ticking in 4 hours
2. **Low risk:** Start small, validate WebSocket approach
3. **Expandable:** Add more symbols incrementally
4. **Professional:** Matches industry standards (Zerodha, Groww use WS)
5. **Within limits:** <100 symbols fits well within Upstox limits

**Next Step:**
If you approve, I'll:

1. Download Upstox MarketDataFeed.proto
2. Create the WebSocket manager service
3. Set up Flask-SocketIO endpoint
4. Build the frontend hook
5. Wire up IndicesStrip for live updates

**Decision Point:**

- Want **true real-time** (Option 1/3)? → I'll start building WebSocket infrastructure
- Want **quick dirty fix** (Option 2)? → I'll add caching + reduce intervals in 1 hour

What do you want to do?
