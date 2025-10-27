import requests
import gzip
import io
import json
from datetime import datetime
from db_pool import get_connection
import os

UPSTOX_TOKEN = os.environ.get("UPSTOX_ACCESS_TOKEN")  # set this in .env
BATCH_SIZE = 100

def get_all_nse_instruments():
    """Download all NSE instruments and return as a list of dicts"""
    url = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.csv.gz"
    response = requests.get(url, stream=True)

    if response.status_code != 200:
        raise Exception(f"Failed to download NSE instruments: {response.status_code}")

    gzip_file = gzip.GzipFile(fileobj=io.BytesIO(response.content))
    lines = gzip_file.read().decode("utf-8").split("\n")

    headers = lines[0].split(",")
    instruments = []

    for line in lines[1:]:
        if not line.strip():
            continue
        data = line.split(",")
        instruments.append(dict(zip(headers, data)))

    return instruments


def fetch_all_stock_prices():
    print("[📦] Fetching NSE instruments...")

    url = "https://assets.upstox.com/market-quote/instruments/NSE_INSTRUMENTS.csv.gz"
    response = requests.get(url)
    response.raise_for_status()

    # Decompress and read CSV
    with gzip.open(io.BytesIO(response.content), "rt") as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        instruments = [row for row in reader]

    print(f"[✅] Total Instruments Fetched: {len(instruments)}")

    connection = get_connection()
    cursor = connection.cursor(dictionary=True)

    # Get all ISINs from Stocks table
    cursor.execute("SELECT stock_id, isin FROM Stocks")
    stocks = cursor.fetchall()
    isin_map = {s["isin"]: s["stock_id"] for s in stocks}

    update_query = """
        INSERT INTO Stock_Prices 
        (stock_id, stock_name, ltp, day_open, day_high, day_low, prev_close, as_of)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            ltp = VALUES(ltp),
            day_open = VALUES(day_open),
            day_high = VALUES(day_high),
            day_low = VALUES(day_low),
            prev_close = VALUES(prev_close),
            as_of = VALUES(as_of)
    """

    values = []
    count = 0
    for inst in instruments:
        isin = inst[11].strip()  # ISIN column
        if isin not in isin_map:
            continue

        stock_id = isin_map[isin]
        stock_name = inst[1]
        ltp = float(inst[4]) if inst[4] else 0.0
        day_open = float(inst[5]) if inst[5] else 0.0
        day_high = float(inst[6]) if inst[6] else 0.0
        day_low = float(inst[7]) if inst[7] else 0.0
        prev_close = float(inst[8]) if inst[8] else 0.0

        values.append((
            stock_id, stock_name, ltp, day_open, day_high, day_low, prev_close, datetime.now()
        ))

        count += 1
        if count % 100 == 0:
            cursor.executemany(update_query, values)
            connection.commit()
            print(f"[🔁] Updated {count} instruments so far...")
            values = []

    if values:
        cursor.executemany(update_query, values)
        connection.commit()

    print(f"[✅] Successfully updated {count} stock prices.")
    cursor.close()
    connection.close()

    return {"success": True, "updated": count}