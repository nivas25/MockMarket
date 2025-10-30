"""
Stock Service Scheduler
Automatically starts/stops the live stock WebSocket service based on market hours
- Starts at 9:13 AM (before market open)
- Stops at 3:30 PM (market close)
- Saves closing prices at 3:31 PM
"""
import threading
import time
from datetime import datetime, timedelta
from utils.market_hours import should_use_websocket, is_eod_update_window, get_current_ist_time, WEBSOCKET_START_TIME
from utils.pretty_log import console, status_ok, status_warn, status_err
from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices

_scheduler_thread = None
_scheduler_stop_event = threading.Event()
_service_running = False
_fetch_thread = None
_fetch_stop_event = threading.Event()


def _calculate_seconds_until(target_time):
    """Calculate seconds until target time today or tomorrow"""
    now = get_current_ist_time()
    target_today = now.replace(hour=target_time.hour, minute=target_time.minute, second=0, microsecond=0)
    
    if now.time() >= target_time:
        # Target time has passed today, schedule for tomorrow
        target_today += timedelta(days=1)
    
    return (target_today - now).total_seconds()


def _stock_fetch_loop():
    """
    Background thread to fetch stock prices during market hours
    - During market hours (9:13 AM - 3:30 PM): Fetch every 10 seconds, WebSocket only (no DB writes)
    - During EOD window (3:31 PM - 3:36 PM): One comprehensive DB save
    """
    status_ok("📈 Stock price fetcher started - Live WebSocket mode")
    
    while not _fetch_stop_event.is_set():
        try:
            # Check if we're in EOD window
            if is_eod_update_window():
                status_ok("💾 EOD WINDOW DETECTED - Saving closing prices to database...")
                fetch_all_stock_prices(save_to_db=True)  # Save to DB during EOD
                console.log("✅ EOD database save complete - sleeping until market close")
                # After EOD save, sleep until service stops
                _fetch_stop_event.wait(300)  # 5 minutes
            else:
                # During market hours: WebSocket only, no DB writes
                fetch_all_stock_prices(save_to_db=False)  # Only broadcast via WebSocket
                
                # Sleep for 10 seconds for real-time ticking (like Upstox)
                _fetch_stop_event.wait(10)
            
        except Exception as e:
            status_err(f"Error in stock fetch loop: {e}")
            _fetch_stop_event.wait(10)  # Wait before retry
    
    status_ok("📈 Stock price fetcher stopped")


def start_stock_service():
    """Start the live stock price fetch service"""
    global _fetch_thread, _fetch_stop_event
    
    if _fetch_thread and _fetch_thread.is_alive():
        status_warn("Stock service already running")
        return
    
    _fetch_stop_event.clear()
    _fetch_thread = threading.Thread(target=_stock_fetch_loop, daemon=True, name="StockFetchService")
    _fetch_thread.start()
    
    status_ok("🚀 Live stock service started (real-time ticking every 10s, EOD saves at 3:31 PM)")


def stop_stock_service():
    """Stop the live stock price fetch service"""
    global _fetch_thread, _fetch_stop_event
    
    _fetch_stop_event.set()
    
    if _fetch_thread:
        _fetch_thread.join(timeout=10)
        _fetch_thread = None
    
    status_ok("🛑 Live stock service stopped")


def _scheduler_loop():
    """
    Main scheduler loop - checks market hours every minute
    
    Timeline:
    - 9:13 AM: Start service (live WebSocket ticking every 10s)
    - 3:30 PM: Market closes (keep service running)
    - 3:31 PM - 3:36 PM: EOD window (save to database)
    - 3:37 PM: Stop service
    """
    global _service_running
    
    status_ok("📅 Stock service scheduler started")
    
    while not _scheduler_stop_event.is_set():
        try:
            now = get_current_ist_time()
            should_run_service = should_use_websocket() or is_eod_update_window()
            
            # Start service during market hours OR EOD window
            if should_run_service and not _service_running:
                console.log(f"⏰ Market hours/EOD detected - starting stock service")
                start_stock_service()
                _service_running = True
            
            # Stop service after EOD window ends
            elif not should_run_service and _service_running:
                console.log(f"⏰ Market hours and EOD ended - stopping stock service")
                stop_stock_service()
                _service_running = False
            
            # Sleep for 60 seconds before next check
            _scheduler_stop_event.wait(60)
            
        except Exception as e:
            status_err(f"Scheduler error: {e}")
            _scheduler_stop_event.wait(60)
    
    # Cleanup when stopped
    if _service_running:
        stop_stock_service()
    
    status_ok("📅 Stock service scheduler stopped")


def start_stock_service_scheduler():
    """Start the automated scheduler"""
    global _scheduler_thread
    
    if _scheduler_thread and _scheduler_thread.is_alive():
        status_warn("Stock scheduler already running")
        return
    
    _scheduler_stop_event.clear()
    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True, name="StockServiceScheduler")
    _scheduler_thread.start()
    
    # Calculate next start time
    seconds_until_start = _calculate_seconds_until(WEBSOCKET_START_TIME)
    hours = int(seconds_until_start // 3600)
    minutes = int((seconds_until_start % 3600) // 60)
    
    status_ok(f"📅 Stock scheduler started - Next service start in {hours}h {minutes}m")


def stop_stock_service_scheduler():
    """Stop the scheduler"""
    global _scheduler_thread
    
    _scheduler_stop_event.set()
    
    if _scheduler_thread:
        _scheduler_thread.join(timeout=5)
        _scheduler_thread = None
    
    status_ok("📅 Stock scheduler stopped")


if __name__ == "__main__":
    # Test the scheduler
    print("=" * 60)
    print("STOCK SERVICE SCHEDULER TEST")
    print("=" * 60)
    
    start_stock_service_scheduler()
    
    try:
        print("\n⏳ Running scheduler for 5 minutes... (Ctrl+C to stop)")
        time.sleep(300)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    finally:
        stop_stock_service_scheduler()
        print("\n✅ Test complete")
