-- Performance indexes for Stock_Prices table
-- These indexes will significantly speed up top-gainers, top-losers, and most-active queries
-- Run these on your MySQL database

-- Index for finding latest prices per stock (used in all movers queries)
CREATE INDEX IF NOT EXISTS idx_stock_prices_stock_as_of 
ON Stock_Prices(stock_id, as_of DESC);

-- Composite index for exchange filtering and sorting
CREATE INDEX IF NOT EXISTS idx_stocks_exchange 
ON Stocks(exchange, stock_id);

-- Index for day_open filtering (used in intraday mode)
CREATE INDEX IF NOT EXISTS idx_stock_prices_day_open 
ON Stock_Prices(day_open);

-- Index for prev_close filtering (used in day-over-day mode)
CREATE INDEX IF NOT EXISTS idx_stock_prices_prev_close 
ON Stock_Prices(prev_close);

-- Index for high/low filtering (used in most-active query)
CREATE INDEX IF NOT EXISTS idx_stock_prices_high_low 
ON Stock_Prices(day_high, day_low);

-- Verify indexes were created
SHOW INDEX FROM Stock_Prices;
SHOW INDEX FROM Stocks;

-- =============================================
-- Stock_History performance and deduplication
-- =============================================

-- Ensure a unique key to support upsert semantics from API backfills
ALTER TABLE Stock_History
	ADD UNIQUE KEY IF NOT EXISTS uk_stock_history (stock_id, timeframe, timestamp);

-- Fast time-series reads for a single stock/timeframe
CREATE INDEX IF NOT EXISTS idx_stock_history_stock_tf_ts
ON Stock_History(stock_id, timeframe, timestamp);

-- Optional covering index for reverse-chron fetches
CREATE INDEX IF NOT EXISTS idx_stock_history_stock_ts_desc
ON Stock_History(stock_id, timestamp DESC);
