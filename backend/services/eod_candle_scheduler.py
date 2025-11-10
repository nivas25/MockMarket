import threading
import time
import logging
from typing import Optional, List, Dict
from datetime import datetime, date

from db_pool import get_connection
from utils.market_hours import is_eod_update_window, get_current_ist_time
from services.live_price_cache import get_all_cached_prices

logger = logging.getLogger(__name__)

class _EODCandleJob:
    def __init__(self, interval_seconds: int = 30):
        self.interval = max(10, interval_seconds)
        self._stop = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._last_run_date: Optional[date] = None

    def start(self):
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop.set()

    def _run(self):
        while not self._stop.is_set():
            try:
                now_ist = get_current_ist_time()
                today = now_ist.date()
                if is_eod_update_window():
                    if self._last_run_date == today:
                        # Already ran today
                        pass
                    else:
                        self._persist_today_candles(today)
                        self._last_run_date = today
                # else: outside window, do nothing
            except Exception as e:
                logger.error(f"EOD candle job error: {e}")
            finally:
                self._stop.wait(self.interval)

    def _persist_today_candles(self, today: date):
        logger.info("Starting EOD candle persistence...")
        snapshot = get_all_cached_prices()  # list of {stock_id, symbol, ltp, day_open, prev_close, day_high, day_low, timestamp}
        if not snapshot:
            logger.warning("EOD: live cache empty; nothing to persist")
            return
        conn = None
        cursor = None
        inserted = 0
        try:
            conn = get_connection()
            cursor = conn.cursor()
            sql = (
                """
                INSERT INTO Stock_History (stock_id, timeframe, timestamp, open_price, high_price, low_price, close_price, volume)
                VALUES (%s,'day',%s,%s,%s,%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                  open_price=VALUES(open_price),
                  high_price=VALUES(high_price),
                  low_price=VALUES(low_price),
                  close_price=VALUES(close_price),
                  volume=VALUES(volume)
                """
            )
            rows = []
            ts = today
            for e in snapshot:
                stock_id = e.get("stock_id")
                if not stock_id:
                    continue
                o = e.get("day_open")
                h = e.get("day_high")
                l = e.get("day_low")
                c = e.get("ltp")
                # Require at minimum open and close to create a candle
                if o is None:
                    # fallback: if no explicit open, use close for doji-like
                    o = c
                if h is None:
                    h = max(x for x in [o, l, c] if x is not None)
                if l is None:
                    l = min(x for x in [o, h, c] if x is not None)
                if c is None:
                    # skip if no close
                    continue
                volume = 0  # placeholder unless intraday volume available
                rows.append((stock_id, ts, float(o), float(h), float(l), float(c), int(volume)))
            if rows:
                cursor.executemany(sql, rows)
                conn.commit()
                inserted = cursor.rowcount
                logger.info(f"EOD: Upserted {len(rows)} daily candles")
            else:
                logger.info("EOD: No rows to upsert after validation")
        except Exception as e:
            logger.error(f"EOD candle persistence failed: {e}")
            if conn:
                try:
                    conn.rollback()
                except Exception:
                    pass
        finally:
            if cursor:
                try:
                    cursor.close()
                except Exception:
                    pass
            if conn:
                try:
                    conn.close()
                except Exception:
                    pass

_eod_job = _EODCandleJob(interval_seconds=30)

def start_eod_candle_scheduler():
    try:
        _eod_job.start()
        logger.info("EOD candle scheduler started (checks every 30s during EOD window)")
    except Exception as e:
        logger.error(f"Failed to start EOD candle scheduler: {e}")
