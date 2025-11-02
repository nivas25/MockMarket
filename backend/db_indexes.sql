-- Performance indexes for MySQL (compatible, idempotent)
-- Note: MySQL does not support "CREATE INDEX IF NOT EXISTS".
-- We check INFORMATION_SCHEMA and create indexes only when missing.

SET @schema := DATABASE();

-- Helper to run conditional CREATE INDEX
-- Usage pattern repeated per index.

-- 1) Stock_Prices(stock_id, as_of)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stock_Prices' AND index_name='idx_stock_prices_stock_as_of';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stock_prices_stock_as_of ON Stock_Prices (stock_id, as_of)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2) Stocks(exchange, stock_id)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stocks' AND index_name='idx_stocks_exchange';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stocks_exchange ON Stocks (exchange, stock_id)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3) Stocks(symbol)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stocks' AND index_name='idx_stocks_symbol';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stocks_symbol ON Stocks (symbol)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 4) Stocks(company_name)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stocks' AND index_name='idx_stocks_company_name';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stocks_company_name ON Stocks (company_name)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 5) Stock_Prices(day_open)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stock_Prices' AND index_name='idx_stock_prices_day_open';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stock_prices_day_open ON Stock_Prices (day_open)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 6) Stock_Prices(prev_close)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stock_Prices' AND index_name='idx_stock_prices_prev_close';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stock_prices_prev_close ON Stock_Prices (prev_close)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 7) Stock_Prices(day_high, day_low)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stock_Prices' AND index_name='idx_stock_prices_high_low';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stock_prices_high_low ON Stock_Prices (day_high, day_low)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =============================================
-- Stock_History performance and deduplication
-- =============================================

-- Unique key for (stock_id, timeframe, timestamp)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stock_History' AND index_name='uk_stock_history';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'ALTER TABLE Stock_History ADD UNIQUE KEY uk_stock_history (stock_id, timeframe, timestamp)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Stock_History(stock_id, timeframe, timestamp)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stock_History' AND index_name='idx_stock_history_stock_tf_ts';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stock_history_stock_tf_ts ON Stock_History (stock_id, timeframe, timestamp)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Optional covering index for reverse-chron fetches (timestamp desc not required)
SELECT COUNT(1) INTO @exists FROM information_schema.statistics
WHERE table_schema=@schema AND table_name='Stock_History' AND index_name='idx_stock_history_stock_ts_desc';
SET @sql := IF(@exists>0,
	'SELECT 1',
	'CREATE INDEX idx_stock_history_stock_ts_desc ON Stock_History (stock_id, timestamp)'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Verification (optional)
SHOW INDEX FROM Stock_Prices;
SHOW INDEX FROM Stocks;
SHOW INDEX FROM Stock_History;
