from typing import Any, Dict, List

from flask import Flask
from flask_socketio import SocketIO


# Single SocketIO instance to be initialized in app.py
socketio: SocketIO = SocketIO(cors_allowed_origins="*", async_mode="threading")


def init_socketio(app: Flask) -> None:
    """Bind the global SocketIO instance to the Flask app."""
    socketio.init_app(app, cors_allowed_origins="*")


def broadcast_prices(updates: List[Dict[str, Any]]) -> None:
    """Broadcast a batch of price updates to subscribers.

    Each update should include at least: { symbol, ltp, as_of }
    Emits two channels:
      - 'prices_batch' with the full list
      - 'price_update' per-symbol room: room=f"symbol:{symbol}"
    """
    if not updates:
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


