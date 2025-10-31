"""
Real-time Index WebSocket Service
Connects to Upstox Market Data Feed during market hours
Broadcasts live index updates to frontend via SocketIO
"""
import os
import json
import threading
import time
from datetime import datetime
from dotenv import load_dotenv
from utils.pretty_log import console, status_ok, status_warn, status_err
from utils.market_hours import should_use_websocket, is_eod_update_window, get_market_status
from services.websocket_manager import socketio
from db_pool import get_connection

load_dotenv()

# Index configuration (same as fetch_indices.py)
INDEX_MAPPING = {
    "NIFTY 50": {"instrument_key": "NSE_INDEX|Nifty 50", "tag": "Benchmark"},  # Hardcoded
    "BANKNIFTY": {"instrument_key": None, "tag": "Banking"},
    "SENSEX": {"instrument_key": None, "tag": "Benchmark"},
    "FINNIFTY": {"instrument_key": None, "tag": "Sectoral"},
    "BANKEX": {"instrument_key": None, "tag": "Banking"},
    "SENSEX50": {"instrument_key": None, "tag": "Broader Market"},
    "NIFTY MIDCAP 50": {"instrument_key": None, "tag": "Broader Market"},
    "NIFTY NEXT 50": {"instrument_key": None, "tag": "Broader Market"},
    "INDIA VIX": {"instrument_key": None, "tag": "Volatility"}
}

# Global cache for live prices (in-memory during market hours)
_live_cache = {}
_cache_lock = threading.Lock()
_ws_thread = None
_stop_event = threading.Event()


def resolve_instrument_keys():
    """Resolve instrument keys for indices from Upstox API"""
    try:
        from controller.fetch.index_fetch.fetch_indices import _resolve_index_instrument_keys
        _resolve_index_instrument_keys()
        status_ok("Instrument keys resolved for indices")
        return True
    except Exception as e:
        status_err(f"Failed to resolve instrument keys: {e}")
        return False


def fetch_live_quotes_polling():
    """
    Fallback: Poll Upstox REST API for quotes every 5 seconds during market hours
    (Since WebSocket implementation would require protobuf and complex setup)
    """
    from controller.fetch.index_fetch.fetch_indices import fetch_index_quotes
    
    while not _stop_event.is_set():
        try:
            # Check if we should still be running
            if not should_use_websocket():
                status_warn("Market hours ended - stopping live polling")
                break
            
            # Fetch quotes from Upstox
            quotes_data = fetch_index_quotes()
            
            if quotes_data:
                # Update cache and broadcast
                with _cache_lock:
                    for index_name, index_info in INDEX_MAPPING.items():
                        instrument_key = index_info["instrument_key"]
                        if not instrument_key:
                            continue
                        
                        # Try to find quote
                        quote = quotes_data.get(instrument_key)
                        if not quote:
                            # Try alternate formats
                            alt_key = instrument_key.replace("|", ":")
                            quote = quotes_data.get(alt_key)
                        
                        if quote:
                            # Extract data
                            ohlc = quote.get("ohlc", {}) or {}
                            ltp = quote.get("last_price") or quote.get("lastPrice")
                            prev_close = ohlc.get("close")
                            
                            if ltp and prev_close:
                                try:
                                    ltp = float(ltp)
                                    prev_close = float(prev_close)
                                    change_value = ltp - prev_close
                                    change_percent = (change_value / prev_close) * 100 if prev_close != 0 else 0
                                    
                                    # Update cache
                                    _live_cache[index_name] = {
                                        "name": index_name,
                                        "ltp": ltp,
                                        "open": float(ohlc.get("open", 0)),
                                        "high": float(ohlc.get("high", 0)),
                                        "low": float(ohlc.get("low", 0)),
                                        "prev_close": prev_close,
                                        "change_value": change_value,
                                        "change_percent": change_percent,
                                        "tag": index_info["tag"],
                                        "last_updated": datetime.now().isoformat()
                                    }
                                except Exception as e:
                                    console.log(f"Error processing {index_name}: {e}")
                
                # Broadcast to all connected clients
                if _live_cache:
                    socketio.emit('indices_update', {
                        "status": "live",
                        "data": list(_live_cache.values()),
                        "timestamp": datetime.now().isoformat()
                    })
                    console.log(f"📡 Broadcasted {len(_live_cache)} live indices")
            
            # Check if EOD window - save to DB
            if is_eod_update_window():
                save_closing_prices()
            
            # Sleep for 5 seconds before next fetch
            _stop_event.wait(5)
            
        except Exception as e:
            status_err(f"Error in live polling: {e}")
            _stop_event.wait(10)  # Wait longer on error


def save_closing_prices():
    """
    Save closing prices to database (called during EOD window 3:31-3:33 PM)
    This creates the snapshot used when market is closed
    """
    try:
        if not _live_cache:
            status_warn("No live data to save")
            return
        
        conn = get_connection()
        cursor = conn.cursor()
        
        saved_count = 0
        with _cache_lock:
            for index_name, data in _live_cache.items():
                instrument_key = INDEX_MAPPING[index_name]["instrument_key"]
                if not instrument_key:
                    continue
                
                sql = """
                    INSERT INTO Index_Prices 
                    (index_name, instrument_key, ltp, open_price, high_price, low_price, 
                     prev_close, change_value, change_percent, tag, last_updated)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ON DUPLICATE KEY UPDATE
                        ltp = VALUES(ltp),
                        open_price = VALUES(open_price),
                        high_price = VALUES(high_price),
                        low_price = VALUES(low_price),
                        prev_close = VALUES(prev_close),
                        change_value = VALUES(change_value),
                        change_percent = VALUES(change_percent),
                        tag = VALUES(tag),
                        last_updated = NOW()
                """
                
                values = (
                    index_name,
                    instrument_key,
                    data["ltp"],
                    data["open"],
                    data["high"],
                    data["low"],
                    data["prev_close"],
                    data["change_value"],
                    data["change_percent"],
                    data["tag"]
                )
                
                cursor.execute(sql, values)
                saved_count += 1
        
        conn.commit()
        cursor.close()
        conn.close()
        
        status_ok(f"💾 Saved {saved_count} closing prices to database")
        
    except Exception as e:
        status_err(f"Failed to save closing prices: {e}")


def start_live_index_service():
    """
    Start the live index service in a background thread
    Only runs during market hours (9:13 AM - 3:30 PM)
    """
    global _ws_thread, _stop_event
    
    # Check if already running
    if _ws_thread and _ws_thread.is_alive():
        status_warn("Live index service already running")
        return
    
    # Check market hours
    market_status = get_market_status()
    if not market_status["should_use_websocket"]:
        status_warn(f"Not starting live service: {market_status['message']}")
        return
    
    # Resolve instrument keys first
    if not resolve_instrument_keys():
        status_err("Cannot start live service - instrument keys not resolved")
        return
    
    # Reset stop event
    _stop_event.clear()
    
    # Start polling thread
    _ws_thread = threading.Thread(target=fetch_live_quotes_polling, daemon=True)
    _ws_thread.start()
    
    status_ok("🚀 Live index service started (polling every 5s)")


def stop_live_index_service():
    """Stop the live index service"""
    global _ws_thread, _stop_event
    
    _stop_event.set()
    
    if _ws_thread:
        _ws_thread.join(timeout=10)
        _ws_thread = None
    
    status_ok("🛑 Live index service stopped")


def get_live_cache():
    """Get current live cache (for debugging)"""
    with _cache_lock:
        return dict(_live_cache)


if __name__ == "__main__":
    # Test the service
    print("=" * 60)
    print("LIVE INDEX SERVICE TEST")
    print("=" * 60)
    
    status = get_market_status()
    print(f"\n📊 Market Status: {status['message']}")
    print(f"⏰ Current Time: {status['current_time_ist']}")
    print(f"✅ Should Use WebSocket: {status['should_use_websocket']}")
    
    if status['should_use_websocket']:
        print("\n🚀 Starting live service...")
        start_live_index_service()
        
        try:
            print("Running for 30 seconds... (Ctrl+C to stop)")
            time.sleep(30)
        except KeyboardInterrupt:
            print("\n\n⚠️  Interrupted by user")
        finally:
            stop_live_index_service()
            print("\n💾 Final cache:")
            print(json.dumps(get_live_cache(), indent=2))
    else:
        print("\n⚠️  Market is closed - service will not start")
