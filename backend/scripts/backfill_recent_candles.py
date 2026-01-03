"""
Backfill recent daily candles for existing NSE stocks only.
Default window: 2025-12-01 to 2026-01-03 (inclusive).
Uses Upstox historical-candle endpoint and upserts into Stock_History.

Run:
  # Ensure UPSTOX_ACCESS_TOKEN is set in .env or environment
  python scripts/backfill_recent_candles.py

Optional env overrides:
  FROM_DATE=2025-12-01
  TO_DATE=2026-01-03
  SLEEP_SECONDS=0.5   # throttle between API calls
"""
import os
import sys
from datetime import datetime, date
import time
from typing import List, Tuple

# Ensure project root on path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from dotenv import load_dotenv
from db_pool import get_connection
from services.http_client import upstox_get
from utils.pretty_log import console, status_ok, status_warn, status_err

load_dotenv()

UPSTOX_TOKEN = os.environ.get("UPSTOX_ACCESS_TOKEN")
DEFAULT_FROM = os.environ.get("FROM_DATE", "2025-12-01")
DEFAULT_TO = os.environ.get("TO_DATE", "2026-01-03")
SLEEP_SECONDS = float(os.environ.get("SLEEP_SECONDS", "0.5"))


def parse_date(val: str) -> date:
    return datetime.strptime(val, "%Y-%m-%d").date()


def fetch_stocks() -> List[Tuple[int, str, str, str]]:
    """Return list of (stock_id, symbol, isin, exchange) for NSE stocks with isin."""
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT stock_id, symbol, isin, exchange
            FROM Stocks
            WHERE exchange='NSE' AND isin IS NOT NULL
            ORDER BY stock_id
            """
        )
        return list(cur.fetchall())
    finally:
        cur.close()
        conn.close()


def backfill(from_date: date, to_date: date) -> None:
    if not UPSTOX_TOKEN:
        status_err("UPSTOX_ACCESS_TOKEN missing")
        return

    stocks = fetch_stocks()
    if not stocks:
        status_warn("No NSE stocks with ISIN found")
        return

    console.rule("📊 Backfill recent candles")
    console.log(f"Window: {from_date} -> {to_date} | Stocks: {len(stocks)}\n")

    total_rows = 0
    conn = get_connection()
    cur = conn.cursor()
    try:
        for idx, (stock_id, symbol, isin, exchange) in enumerate(stocks, start=1):
            instrument_key = f"{exchange}_EQ|{isin}"
            url = (
                f"https://api.upstox.com/v2/historical-candle/"
                f"{instrument_key}/day/{to_date:%Y-%m-%d}/{from_date:%Y-%m-%d}"
            )
            headers = {
                "Accept": "application/json",
                "Authorization": f"Bearer {UPSTOX_TOKEN}",
            }
            try:
                resp = upstox_get(url, headers=headers)
                resp.raise_for_status()
                body = resp.json() or {}
                if body.get("status") != "success":
                    status_warn(f"[{idx}/{len(stocks)}] {symbol}: API error {body}")
                    continue
                candles = body.get("data", {}).get("candles", []) or []
                if not candles:
                    status_warn(f"[{idx}/{len(stocks)}] {symbol}: no candles returned")
                    continue

                rows = []
                for row in candles:
                    # row = [timestamp, open, high, low, close, volume, oi]
                    ts_iso = row[0]
                    ts_date = datetime.fromisoformat(ts_iso.replace("Z", "+00:00")).date()
                    o, h, l, c = (float(row[1] or 0), float(row[2] or 0), float(row[3] or 0), float(row[4] or 0))
                    v = int(row[5] or 0)
                    rows.append((stock_id, "day", ts_date, o, h, l, c, v))

                cur.executemany(
                    """
                    INSERT INTO Stock_History (stock_id, timeframe, timestamp, open_price, high_price, low_price, close_price, volume)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                    ON DUPLICATE KEY UPDATE
                      open_price=VALUES(open_price),
                      high_price=VALUES(high_price),
                      low_price=VALUES(low_price),
                      close_price=VALUES(close_price),
                      volume=VALUES(volume)
                    """,
                    rows,
                )
                conn.commit()
                total_rows += len(rows)
                status_ok(f"[{idx}/{len(stocks)}] {symbol}: upserted {len(rows)} candles")
            except Exception as exc:
                status_err(f"[{idx}/{len(stocks)}] {symbol}: {exc}")
            finally:
                time.sleep(SLEEP_SECONDS)

    finally:
        cur.close()
        conn.close()
        console.rule("✅ Done")
        console.log(f"Total candles upserted: {total_rows}")


if __name__ == "__main__":
    from_date = parse_date(DEFAULT_FROM)
    to_date = parse_date(DEFAULT_TO)
    backfill(from_date, to_date)
