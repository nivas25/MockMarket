from flask import Blueprint, jsonify
import time

from db_pool import get_connection


health_bp = Blueprint("health", __name__)


@health_bp.get("/healthz")
def healthz():
    t0 = time.time()
    db_ok = False
    err = None
    conn = None
    cur = None
    try:
        # Try a lightweight DB round-trip
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.fetchone()
        db_ok = True
    except Exception as e:
        err = str(e)
    finally:
        try:
            if cur:
                cur.close()
        except Exception:
            pass
        try:
            if conn:
                conn.close()
        except Exception:
            pass

    payload = {
        "status": "ok" if db_ok else "degraded",
        "db": db_ok,
        "elapsed_ms": int((time.time() - t0) * 1000),
    }
    if err and not db_ok:
        payload["error"] = err

    return jsonify(payload), (200 if db_ok else 503)
