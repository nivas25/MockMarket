# Smart Market-Aware Scheduler
from datetime import datetime, time as dt_time, timedelta
import time

class MarketAwareScheduler:
    """
    Intelligent scheduler that adjusts fetch frequency based on market status.
    
    - Market Open (9:15 AM - 3:30 PM IST): Every 2 minutes (live ticking)
    - Pre-Market (9:00-9:15 AM): Every 5 minutes
    - Post-Market (3:30-4:00 PM): Every 10 minutes
    - Market Closed: Once at 6:00 PM (EOD data), then sleep until next day
    """
    
    MARKET_TIMEZONE = "Asia/Kolkata"
    MARKET_OPEN = dt_time(9, 15)      # 9:15 AM
    MARKET_CLOSE = dt_time(15, 30)    # 3:30 PM
    PRE_MARKET = dt_time(9, 0)        # 9:00 AM
    POST_MARKET = dt_time(16, 0)      # 4:00 PM
    EOD_FETCH = dt_time(18, 0)        # 6:00 PM
    
    def __init__(self):
        self.last_eod_fetch = None
        
    def get_next_interval(self):
        """
        Determine the next fetch interval based on current time.
        
        Returns:
            (interval_seconds, save_to_db_flag)
        """
        from utils.market_hours import is_market_open, is_market_day
        
        now = datetime.now()
        current_time = now.time()
        
        # Weekend or holiday - sleep until next market day
        if not is_market_day():
            # Calculate seconds until 8:00 AM next market day
            return self._seconds_until_next_market_day(), False
        
        # Market hours (9:15 AM - 3:30 PM) - Live updates
        if self.MARKET_OPEN <= current_time <= self.MARKET_CLOSE:
            return 120, False  # 2 minutes, WebSocket only
        
        # Pre-market (9:00-9:15 AM)
        elif self.PRE_MARKET <= current_time < self.MARKET_OPEN:
            return 300, False  # 5 minutes, no DB save
        
        # Post-market (3:30-4:00 PM)
        elif self.MARKET_CLOSE < current_time <= self.POST_MARKET:
            return 600, False  # 10 minutes, no DB save
        
        # EOD window (6:00 PM) - Save closing prices to DB
        elif current_time >= self.EOD_FETCH:
            today = now.date()
            if self.last_eod_fetch != today:
                self.last_eod_fetch = today
                return 0, True  # Fetch immediately with DB save
            else:
                # Already did EOD fetch - sleep until next day
                return self._seconds_until_tomorrow_premarket(), False
        
        # Between market close and EOD (3:30 PM - 6:00 PM)
        else:
            # Wait until EOD time
            return self._seconds_until(self.EOD_FETCH), False
    
    def _seconds_until(self, target_time):
        """Calculate seconds until target time today"""
        now = datetime.now()
        target = datetime.combine(now.date(), target_time)
        if target < now:
            target = datetime.combine(now.date() + timedelta(days=1), target_time)
        return int((target - now).total_seconds())
    
    def _seconds_until_tomorrow_premarket(self):
        """Calculate seconds until 9:00 AM tomorrow"""
        from datetime import timedelta
        now = datetime.now()
        tomorrow = now.date() + timedelta(days=1)
        target = datetime.combine(tomorrow, self.PRE_MARKET)
        return int((target - now).total_seconds())
    
    def _seconds_until_next_market_day(self):
        """Calculate seconds until 8:00 AM on next market day"""
        from datetime import timedelta
        from utils.market_hours import is_market_day_check
        
        now = datetime.now()
        days_ahead = 1
        
        while days_ahead < 7:
            next_day = now.date() + timedelta(days=days_ahead)
            if is_market_day_check(next_day):
                target = datetime.combine(next_day, dt_time(8, 0))
                return int((target - now).total_seconds())
            days_ahead += 1
        
        # Fallback: 24 hours
        return 86400


# Modified stock_scheduler.py:
def _runner_smart(scheduler):
    """Smart runner that adapts to market hours"""
    from utils.pretty_log import banner, status_ok, status_warn, status_err
    from controller.fetch.stock_prices_fetch.fetch_stocks_prices import fetch_all_stock_prices
    
    banner("Smart Stock Price Fetcher", "Market-Aware Scheduling", style="bold magenta")
    
    while True:
        try:
            interval, save_to_db = scheduler.get_next_interval()
            
            if interval == 0:
                # Immediate fetch (EOD time)
                status_ok("⏰ EOD Fetch - Saving to DB")
                fetch_all_stock_prices(save_to_db=True)
            elif interval > 3600:
                # Long sleep (market closed)
                hours = interval / 3600
                status_warn(f"💤 Market closed - Sleeping {hours:.1f} hours until next market day")
                time.sleep(interval)
                continue
            else:
                # Normal fetch during market hours
                fetch_all_stock_prices(save_to_db=save_to_db)
                status_ok(f"Next fetch in {interval}s (save_to_db={save_to_db})")
                time.sleep(interval)
                
        except Exception as e:
            status_err(f"Smart scheduler error: {e}")
            time.sleep(120)  # Fallback to 2 minutes


# Usage in app.py:
# from services.stock_scheduler_smart import MarketAwareScheduler, _runner_smart
# scheduler = MarketAwareScheduler()
# t = threading.Thread(target=_runner_smart, args=(scheduler,), daemon=True)
# t.start()
