# Stock Fetch Metrics Tracker
import time
from collections import defaultdict
from datetime import datetime, timedelta

class FetchMetrics:
    """Track stock fetching performance and health"""
    def __init__(self):
        self.total_fetches = 0
        self.successful_fetches = 0
        self.failed_stocks = defaultdict(int)  # {symbol: failure_count}
        self.api_latencies = []  # Last 100 API calls
        self.last_fetch_time = None
        self.start_time = datetime.now()
        
    def record_fetch_start(self):
        """Record the start of a fetch cycle"""
        self.total_fetches += 1
        self.last_fetch_time = time.time()
        
    def record_fetch_end(self, success_count, failed_count):
        """Record the end of a fetch cycle"""
        self.successful_fetches += success_count
        elapsed = time.time() - self.last_fetch_time
        return elapsed
        
    def record_api_call(self, latency_ms):
        """Track API call latency"""
        self.api_latencies.append(latency_ms)
        if len(self.api_latencies) > 100:
            self.api_latencies.pop(0)
            
    def record_failed_stock(self, symbol):
        """Track stocks that repeatedly fail"""
        self.failed_stocks[symbol] += 1
        
    def get_stats(self):
        """Get comprehensive metrics"""
        avg_latency = sum(self.api_latencies) / len(self.api_latencies) if self.api_latencies else 0
        uptime = (datetime.now() - self.start_time).total_seconds() / 3600  # hours
        
        # Stocks with >5 failures
        problematic_stocks = {k: v for k, v in self.failed_stocks.items() if v > 5}
        
        return {
            "total_fetch_cycles": self.total_fetches,
            "successful_fetches": self.successful_fetches,
            "success_rate": (self.successful_fetches / max(1, self.total_fetches)) * 100,
            "avg_api_latency_ms": avg_latency,
            "problematic_stocks": problematic_stocks,
            "uptime_hours": uptime,
            "last_fetch": self.last_fetch_time
        }
        
    def should_alert(self):
        """Check if metrics warrant an alert"""
        stats = self.get_stats()
        
        # Alert if success rate < 90%
        if stats["success_rate"] < 90:
            return f"⚠️ Low success rate: {stats['success_rate']:.1f}%"
            
        # Alert if avg latency > 5 seconds
        if stats["avg_api_latency_ms"] > 5000:
            return f"⚠️ High API latency: {stats['avg_api_latency_ms']}ms"
            
        # Alert if >10 stocks failing repeatedly
        if len(stats["problematic_stocks"]) > 10:
            return f"⚠️ {len(stats['problematic_stocks'])} stocks failing repeatedly"
            
        return None

# Global metrics instance
fetch_metrics = FetchMetrics()

# Usage in fetch_stocks_prices.py:
# from .fetch_metrics import fetch_metrics
#
# fetch_metrics.record_fetch_start()
# start_time = time.time()
# resp = upstox_get(...)
# fetch_metrics.record_api_call((time.time() - start_time) * 1000)
# 
# # At end of fetch cycle:
# elapsed = fetch_metrics.record_fetch_end(total_inserted, skipped_count)
# alert = fetch_metrics.should_alert()
# if alert:
#     status_warn(alert)
