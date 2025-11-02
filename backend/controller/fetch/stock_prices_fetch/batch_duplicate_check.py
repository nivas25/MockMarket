# Optimized Batch Duplicate Detection
# Instead of N individual queries, use a single batch query

def get_last_ltps_batch(cursor, stock_ids):
    """
    Fetch last LTP for multiple stocks in ONE query.
    
    Before (N queries):
        for stock_id in stock_ids:
            cursor.execute("SELECT ltp FROM Stock_Prices WHERE stock_id = %s ORDER BY as_of DESC LIMIT 1", (stock_id,))
    
    After (1 query):
        last_ltps = get_last_ltps_batch(cursor, stock_ids)
    """
    if not stock_ids:
        return {}
    
    # Use window function to get latest LTP per stock
    placeholders = ','.join(['%s'] * len(stock_ids))
    query = f"""
        SELECT stock_id, ltp
        FROM (
            SELECT stock_id, ltp, 
                   ROW_NUMBER() OVER (PARTITION BY stock_id ORDER BY as_of DESC) as rn
            FROM Stock_Prices
            WHERE stock_id IN ({placeholders})
        ) ranked
        WHERE rn = 1
    """
    
    cursor.execute(query, stock_ids)
    results = cursor.fetchall()
    
    # Return {stock_id: ltp} mapping
    return {row['stock_id']: float(row['ltp']) for row in results}


# Usage in fetch_stocks_prices.py (replace the loop):
#
# # Before processing batch, get all last LTPs in one query
# last_ltps = get_last_ltps_batch(cursor, stock_ids)
#
# for idx, ik in enumerate(instrument_keys):
#     # ... parse stock_quote ...
#     
#     stock_id = stock_ids[idx]
#     last_ltp = last_ltps.get(stock_id, 0)
#     
#     if last_ltp and float(last_ltp) == ltp:
#         unchanged_count += 1
#         continue
#     
#     # ... rest of logic ...
