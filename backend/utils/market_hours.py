"""
Market Hours Detection Utility
NSE Trading Hours: 9:15 AM - 3:30 PM IST (Monday-Friday)
"""
from datetime import datetime, time
import pytz

# Indian timezone
IST = pytz.timezone('Asia/Kolkata')

# NSE market hours
MARKET_OPEN_TIME = time(9, 15)  # 9:15 AM
MARKET_CLOSE_TIME = time(15, 30)  # 3:30 PM

# WebSocket should start a bit before market opens
WEBSOCKET_START_TIME = time(9, 13)  # 9:13 AM (start 2 mins early)
WEBSOCKET_END_TIME = time(15, 30)  # 3:30 PM (end at market close)

# EOD update window (save closing prices) - 5 minutes window
EOD_UPDATE_START = time(15, 31)  # 3:31 PM (1 min after close)
EOD_UPDATE_END = time(15, 36)  # 3:36 PM (5 minutes to fill database)


def get_current_ist_time():
    """Get current time in IST"""
    return datetime.now(IST)


def is_market_open():
    """
    Check if NSE market is currently open
    Returns True if it's a weekday between 9:15 AM and 3:30 PM IST
    """
    now = get_current_ist_time()
    
    # Check if it's a weekday (Monday=0, Sunday=6)
    if now.weekday() >= 5:  # Saturday or Sunday
        return False
    
    current_time = now.time()
    return MARKET_OPEN_TIME <= current_time <= MARKET_CLOSE_TIME


def should_use_websocket():
    """
    Check if we should use WebSocket for live data
    Start at 9:13 AM, stop at 3:30 PM
    """
    now = get_current_ist_time()
    
    # Only on weekdays
    if now.weekday() >= 5:
        return False
    
    current_time = now.time()
    return WEBSOCKET_START_TIME <= current_time <= WEBSOCKET_END_TIME


def is_eod_update_window():
    """
    Check if we're in the EOD (End of Day) update window
    3:31 PM - 3:36 PM: 5-minute window to save closing prices to database
    """
    now = get_current_ist_time()
    
    # Only on weekdays
    if now.weekday() >= 5:
        return False
    
    current_time = now.time()
    return EOD_UPDATE_START <= current_time <= EOD_UPDATE_END


def get_market_status():
    """
    Get detailed market status
    Returns dict with status and timing info
    """
    now = get_current_ist_time()
    current_time = now.time()
    is_weekday = now.weekday() < 5
    
    status = {
        "is_weekday": is_weekday,
        "current_time_ist": now.strftime("%Y-%m-%d %H:%M:%S"),
        "is_market_open": is_market_open(),
        "should_use_websocket": should_use_websocket(),
        "is_eod_window": is_eod_update_window()
    }
    
    if not is_weekday:
        status["message"] = "Market closed (Weekend)"
    elif current_time < WEBSOCKET_START_TIME:
        status["message"] = "Market not yet open"
    elif current_time > MARKET_CLOSE_TIME:
        status["message"] = "Market closed for the day"
    elif is_eod_update_window():
        status["message"] = "EOD update in progress"
    elif should_use_websocket():
        status["message"] = "Market open - Using WebSocket"
    else:
        status["message"] = "Use historical data from DB"
    
    return status


def time_until_market_open():
    """Calculate seconds until market opens"""
    now = get_current_ist_time()
    
    # If it's weekend, calculate to next Monday
    if now.weekday() >= 5:
        days_until_monday = (7 - now.weekday()) if now.weekday() == 6 else 1
        next_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
        next_open = next_open + pytz.timedelta(days=days_until_monday)
        return (next_open - now).total_seconds()
    
    # If before market open time today
    today_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
    if now.time() < MARKET_OPEN_TIME:
        return (today_open - now).total_seconds()
    
    # If after market close, calculate to tomorrow
    if now.time() > MARKET_CLOSE_TIME:
        # If Friday, next open is Monday
        if now.weekday() == 4:
            days_to_add = 3
        else:
            days_to_add = 1
        
        next_open = now.replace(hour=9, minute=15, second=0, microsecond=0)
        next_open = next_open + pytz.timedelta(days=days_to_add)
        return (next_open - now).total_seconds()
    
    return 0  # Market is open now


if __name__ == "__main__":
    # Test the utility
    print("=" * 60)
    print("MARKET HOURS UTILITY TEST")
    print("=" * 60)
    
    status = get_market_status()
    print(f"\n📅 Current Time (IST): {status['current_time_ist']}")
    print(f"📊 Market Status: {status['message']}")
    print(f"\n✅ Is Weekday: {status['is_weekday']}")
    print(f"✅ Is Market Open: {status['is_market_open']}")
    print(f"✅ Should Use WebSocket: {status['should_use_websocket']}")
    print(f"✅ Is EOD Window: {status['is_eod_window']}")
    
    if not status['is_market_open']:
        seconds = time_until_market_open()
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        print(f"\n⏰ Time until market opens: {hours}h {minutes}m")
    
    print("\n" + "=" * 60)
