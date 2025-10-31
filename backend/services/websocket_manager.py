from typing import Any, Dict, List

from flask import Flask
from flask_socketio import SocketIO


# Single SocketIO instance to be initialized in app.py
socketio: SocketIO = None  # Initialize lazily


def init_socketio(app: Flask) -> None:
    """Bind the global SocketIO instance to the Flask app."""
    global socketio
    socketio = SocketIO(
        app,
        cors_allowed_origins="*",
        async_mode="eventlet",  # Switch to eventlet for async WebSocket handling (requires pip install eventlet)
        logger=True,
        engineio_logger=False  # Set to True for more verbose debugging
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
        pass