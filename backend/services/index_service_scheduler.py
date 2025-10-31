"""
Index Service Scheduler
Automatically starts/stops the live index WebSocket service based on market hours
- Starts at 9:13 AM (before market open)
- Stops at 3:30 PM (market close)
- Saves closing prices at 3:31 PM
"""
import threading
import time
from datetime import datetime, timedelta
from utils.market_hours import should_use_websocket, is_eod_update_window, get_current_ist_time, WEBSOCKET_START_TIME, EOD_UPDATE_START
from utils.pretty_log import console, status_ok, status_warn, status_err
from services.index_websocket import start_live_index_service, stop_live_index_service, save_closing_prices

_scheduler_thread = None
_scheduler_stop_event = threading.Event()
_service_running = False


def _calculate_seconds_until(target_time):
    """Calculate seconds until target time today or tomorrow"""
    now = get_current_ist_time()
    target_today = now.replace(hour=target_time.hour, minute=target_time.minute, second=0, microsecond=0)
    
    if now.time() >= target_time:
        # Target time has passed today, schedule for tomorrow
        target_today += timedelta(days=1)
    
    return (target_today - now).total_seconds()


def _scheduler_loop():
    """Main scheduler loop - checks market hours every minute"""
    global _service_running
    
    status_ok("📅 Index service scheduler started")
    eod_saved_today = False
    
    while not _scheduler_stop_event.is_set():
        try:
            now = get_current_ist_time()
            should_run = should_use_websocket()
            is_eod = is_eod_update_window()
            
            # Check if we should start the service
            if should_run and not _service_running:
                console.log(f"⏰ Market hours detected - starting live service")
                start_live_index_service()
                _service_running = True
                eod_saved_today = False  # Reset EOD flag for new day
            
            # Check if we should stop the service
            elif not should_run and _service_running:
                console.log(f"⏰ Market hours ended - stopping live service")
                stop_live_index_service()
                _service_running = False
            
            # Check if we should save EOD data
            if is_eod and not eod_saved_today:
                console.log(f"💾 EOD window detected - saving closing prices")
                save_closing_prices()
                eod_saved_today = True
            
            # Reset EOD flag at midnight
            if now.hour == 0 and now.minute == 0:
                eod_saved_today = False
            
            # Sleep for 60 seconds before next check
            _scheduler_stop_event.wait(60)
            
        except Exception as e:
            status_err(f"Scheduler error: {e}")
            _scheduler_stop_event.wait(60)
    
    # Cleanup when stopped
    if _service_running:
        stop_live_index_service()
    
    status_ok("📅 Index service scheduler stopped")


def start_index_service_scheduler():
    """Start the automated scheduler"""
    global _scheduler_thread
    
    if _scheduler_thread and _scheduler_thread.is_alive():
        status_warn("Scheduler already running")
        return
    
    _scheduler_stop_event.clear()
    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True, name="IndexServiceScheduler")
    _scheduler_thread.start()
    
    # Calculate next start time
    seconds_until_start = _calculate_seconds_until(WEBSOCKET_START_TIME)
    hours = int(seconds_until_start // 3600)
    minutes = int((seconds_until_start % 3600) // 60)
    
    status_ok(f"📅 Scheduler started - Next service start in {hours}h {minutes}m")


def stop_index_service_scheduler():
    """Stop the scheduler"""
    global _scheduler_thread
    
    _scheduler_stop_event.set()
    
    if _scheduler_thread:
        _scheduler_thread.join(timeout=5)
        _scheduler_thread = None
    
    status_ok("📅 Scheduler stopped")


if __name__ == "__main__":
    # Test the scheduler
    print("=" * 60)
    print("INDEX SERVICE SCHEDULER TEST")
    print("=" * 60)
    
    start_index_service_scheduler()
    
    try:
        print("\n⏳ Running scheduler for 2 minutes... (Ctrl+C to stop)")
        time.sleep(120)
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    finally:
        stop_index_service_scheduler()
        print("\n✅ Test complete")
