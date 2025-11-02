from typing import Any, Dict, List

from flask import Flask
from flask_socketio import SocketIO
from flask import request
import os


# Single SocketIO instance to be initialized in app.py
<<<<<<< HEAD
socketio: SocketIO = None  # Initialize lazily
=======
socketio: SocketIO = SocketIO(cors_allowed_origins="*", async_mode="gevent")
>>>>>>> 1cdd0efd152e241069fd9c31b3556ae4287530e5


def init_socketio(app: Flask) -> None:
    """Bind the global SocketIO instance to the Flask app."""
<<<<<<< HEAD
    global socketio
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode="eventlet",  # Switch to eventlet for async WebSocket handling (requires pip install eventlet)
        logger=True,
        engineio_logger=False  # Set to True for more verbose debugging
=======
    # Toggle verbose socket logging via env (default: off for performance)
    debug_socket = os.getenv("DEBUG_SOCKET", "false").lower() in ("1", "true", "yes", "on")

    socketio.init_app(
        app,
        cors_allowed_origins="*",
        async_mode="gevent",
        logger=debug_socket,
        engineio_logger=debug_socket,
>>>>>>> 1cdd0efd152e241069fd9c31b3556ae4287530e5
    )
    print("✅ SocketIO initialized with eventlet async_mode")


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
<<<<<<< HEAD
        pass
=======
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


>>>>>>> 1cdd0efd152e241069fd9c31b3556ae4287530e5
