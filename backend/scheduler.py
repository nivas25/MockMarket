import os
import requests
import gzip
import io
import json
from datetime import datetime
import upstox_client
from upstox_client.rest import ApiException
from dotenv import load_dotenv

load_dotenv()

def fetch_all_instruments():
    print("[DATA-FETCHER] Starting instrument download...")
    url = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz"
    
    try:
        response = requests.get(url)
        response.raise_for_status()

        with gzip.GzipFile(fileobj=io.BytesIO(response.content)) as gz_file:
            instruments = json.loads(gz_file.read().decode('utf-8'))
        
        structured_stocks = []
        for instrument in instruments:
            if (instrument.get('exchange') == 'NSE' and 
                instrument.get('instrument_type') == 'EQ'):
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

def fetch_live_prices(instrument_keys):
    print(f"[DATA-FETCHER] Fetching prices for {len(instrument_keys)} instruments...")
    access_token = os.getenv('UPSTOX_ACCESS_TOKEN')
    if not access_token:
        print("[DATA-FETCHER] ERROR: UPSTOX_ACCESS_TOKEN not set.")
        return {}

    configuration = upstox_client.Configuration()
    configuration.access_token = access_token
    api_instance = upstox_client.MarketQuoteApi(upstox_client.ApiClient(configuration))
    
    structured_prices = {}
    try:
        api_response = api_instance.get_full_market_quote(api_version="2.0", symbol=",".join(instrument_keys))
        price_data = api_response.data
        
        for _, quote in price_data.items():
            if not quote or not hasattr(quote, 'last_price') or not hasattr(quote, 'instrument_token'):
                print(f"[DATA-FETCHER] No valid data for {quote.symbol if quote else 'unknown'}")
                continue
            
            instrument_key = quote.instrument_token
            ohlc = getattr(quote, 'ohlc', None)
            structured_prices[instrument_key] = {
                'ltp': getattr(quote, 'last_price', None),
                'day_open': getattr(ohlc, 'open', None) if ohlc else None,
                'day_high': getattr(ohlc, 'high', None) if ohlc else None,
                'day_low': getattr(ohlc, 'low', None) if ohlc else None,
                'prev_close': getattr(ohlc, 'close', None) if ohlc else None,
                'as_of': (
                    datetime.fromtimestamp(int(quote.last_trade_time) / 1000)
                    if hasattr(quote, 'last_trade_time') and quote.last_trade_time and quote.last_trade_time.isdigit()
                    else None
                )
            }
        
        print(f"[DATA-FETCHER] Success! Fetched prices for {len(structured_prices)} instruments.")
        return structured_prices

    except ApiException as e:
        print(f"[DATA-FETCHER] API error: Status {e.status}, Body: {e.body}")
        return {}
    except Exception as e:
        print(f"[DATA-FETCHER] Unexpected error: {e}")
        return {}