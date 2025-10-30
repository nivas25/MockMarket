from db_pool import get_connection
from datetime import datetime, timedelta

conn = get_connection()
cursor = conn.cursor(dictionary=True)

today = datetime.now().date()
from_date = today - timedelta(days=5*2)
to_date = today

print(f'Query range: {from_date} to {to_date}')

cursor.execute('SELECT stock_id FROM Stocks WHERE symbol = %s', ('MARUTI',))
stock = cursor.fetchone()
print(f'Stock: {stock}')

cursor.execute('''
    SELECT timestamp, open_price, high_price, low_price, close_price, volume
    FROM Stock_History
    WHERE stock_id = %s AND timeframe = %s AND timestamp BETWEEN %s AND %s
    ORDER BY timestamp ASC
''', (stock['stock_id'], 'day', from_date, to_date))

results = cursor.fetchall()
print(f'\nFound {len(results)} candles')
print('\nFirst 3 candles:')
for r in results[:3]:
    print(r)

print('\nLast 3 candles:')
for r in results[-3:]:
    print(r)

cursor.close()
conn.close()
