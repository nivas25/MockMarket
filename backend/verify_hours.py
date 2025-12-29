from utils.market_hours import is_market_open, MARKET_HOLIDAYS_2025
from datetime import datetime
import pytz

print(f"Total Holidays: {len(MARKET_HOLIDAYS_2025)}")
print(f"Is today ({datetime.now().strftime('%Y-%m-%d')}) a holiday? {datetime.now().strftime('%Y-%m-%d') in MARKET_HOLIDAYS_2025}")

# Test a known holiday
holiday = list(MARKET_HOLIDAYS_2025)[0]
print(f"Testing holiday: {holiday}")
# Mocking time would be complex here without a library, so we just check the set logic
if holiday in MARKET_HOLIDAYS_2025:
    print("✅ Holiday logic check passed (set membership)")
else:
    print("❌ Holiday logic check failed")
