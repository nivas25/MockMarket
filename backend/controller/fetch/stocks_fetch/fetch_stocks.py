# data_fetcher_instruments.py
import os
import requests
import gzip
import io
import json
from dotenv import load_dotenv

load_dotenv()

def fetch_all_instruments():
    """
    Fetch all NSE instruments from Upstox and return structured list.
    """
    print("[DATA-FETCHER] Starting instrument download...")
    url = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz"
    
    try:
        response = requests.get(url)
        response.raise_for_status()

        with gzip.GzipFile(fileobj=io.BytesIO(response.content)) as gz_file:
            instruments = json.loads(gz_file.read().decode('utf-8'))
        
        structured_stocks = []
        for instrument in instruments:
            if instrument.get('exchange') == 'NSE' and instrument.get('instrument_type') == 'EQ':
                structured_stocks.append({
                    'symbol': instrument.get('trading_symbol'),
                    'isin': instrument.get('isin'),
                    'company_name': instrument.get('name'),
                    'exchange': instrument.get('exchange'),
                    'instrument_key': instrument.get('instrument_key')
                })
        
        print(f"[DATA-FETCHER] Success! Found {len(structured_stocks)} NSE stocks.")
        return structured_stocks

    except requests.exceptions.RequestException as e:
        print(f"[DATA-FETCHER] HTTP error: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"[DATA-FETCHER] JSON parsing error: {e}")
        return []
    except Exception as e:
        print(f"[DATA-FETCHER] Unexpected error: {e}")
        return []
