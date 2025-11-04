from typing import Any, Dict, List
import logging

from flask import Flask
from flask_socketio import SocketIO
from flask import request
import os

logger = logging.getLogger(__name__)

# Single SocketIO instance to be initialized in app.py
socketio: SocketIO = SocketIO(cors_allowed_origins="*", async_mode="gevent")


def init_socketio(app: Flask) -> None:
    """Bind the global SocketIO instance to the Flask app."""
    # Toggle verbose socket logging via env (default: off for performance)
    debug_socket = os.getenv("DEBUG_SOCKET", "false").lower() in ("1", "true", "yes", "on")

    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode="gevent",
        logger=debug_socket,
        engineio_logger=debug_socket,
    )
    logger.info("SocketIO initialized with gevent async_mode")


def broadcast_prices(updates: List[Dict[str, Any]]) -> None:
    """Broadcast a batch of price updates to subscribers.

    Each update should include at least: { symbol, ltp, as_of }
    Emits two channels:
      - 'prices_batch' with the full list
      - 'price_update' per-symbol room: room=f"symbol:{symbol}"
    """
    if not updates or not socketio:
        return
    try:
        socketio.emit("prices_batch", updates)
        for u in updates:
            symbol = u.get("symbol")
            if not symbol:
                continue
            socketio.emit("price_update", u, room=f"symbol:{symbol}")
    except Exception:
        # Emitting is best-effort; avoid breaking the fetcher
        pass


# Basic connect/disconnect logs for debugging connection lifecycle
@socketio.on("connect")
def _on_connect():
    try:
        sid = getattr(request, 'sid', None)
        print(f"[SocketIO] Client connected: {sid}")
    except Exception:
        print("[SocketIO] Client connected")


@socketio.on("disconnect")
def _on_disconnect():
    try:
        sid = getattr(request, 'sid', None)
        print(f"[SocketIO] Client disconnected: {sid}")
    except Exception:
        print("[SocketIO] Client disconnected")
