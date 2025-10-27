from db_pool import get_connection
from typing import Dict, Any


def calculate_market_sentiment() -> Dict[str, Any]:
    """
    Calculate market sentiment based on latest stock price movements
    
    Returns sentiment data with overall direction, score, and percentages
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get latest prices with % changes
        sql = """
            SELECT 
                s.stock_id,
                s.symbol,
                sp.ltp,
                sp.prev_close,
                CASE WHEN sp.prev_close IS NOT NULL AND sp.prev_close <> 0 
                     THEN ((sp.ltp - sp.prev_close) / sp.prev_close) * 100
                     ELSE NULL END AS change_percent
            FROM Stock_Prices sp
            INNER JOIN (
                SELECT stock_id, MAX(as_of) AS max_as_of
                FROM Stock_Prices
                GROUP BY stock_id
            ) latest
              ON latest.stock_id = sp.stock_id AND latest.max_as_of = sp.as_of
            INNER JOIN Stocks s ON s.stock_id = sp.stock_id
            WHERE sp.prev_close IS NOT NULL AND sp.prev_close <> 0
              AND s.exchange = 'NSE'
        """
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        if not rows or len(rows) < 10:
            # Not enough data, return neutral
            return {
                "overall": "neutral",
                "score": 50,
                "bullishPercent": 33,
                "bearishPercent": 33,
                "neutralPercent": 34,
                "totalStocks": len(rows),
                "timestamp": None
            }
        
        # Categorize stocks
        bullish_count = 0
        bearish_count = 0
        neutral_count = 0
        total_change = 0.0
        
        for row in rows:
            pct = row.get("change_percent")
            if pct is None:
                neutral_count += 1
                continue
            
            pct_val = float(pct)
            total_change += pct_val
            
            if pct_val > 0.5:  # > +0.5% is bullish
                bullish_count += 1
            elif pct_val < -0.5:  # < -0.5% is bearish
                bearish_count += 1
            else:  # between -0.5% and +0.5% is neutral
                neutral_count += 1
        
        total = len(rows)
        bullish_pct = round((bullish_count / total) * 100)
        bearish_pct = round((bearish_count / total) * 100)
        neutral_pct = 100 - bullish_pct - bearish_pct  # ensure they sum to 100
        
        # Calculate overall score (0-100, where 50 is neutral)
        # Score is based on net bullish/bearish ratio
        avg_change = total_change / total if total > 0 else 0
        # Map avg_change to 0-100 scale (e.g., +3% => ~75, -3% => ~25)
        score = 50 + (avg_change * 10)  # rough mapping
        score = max(0, min(100, int(score)))  # clamp 0-100
        
        # Determine overall sentiment
        if score >= 60:
            overall = "bullish"
        elif score <= 40:
            overall = "bearish"
        else:
            overall = "neutral"
        
        return {
            "overall": overall,
            "score": score,
            "bullishPercent": bullish_pct,
            "bearishPercent": bearish_pct,
            "neutralPercent": neutral_pct,
            "totalStocks": total,
            "timestamp": None  # could add real timestamp if needed
        }
        
    finally:
        cursor.close()
        conn.close()
