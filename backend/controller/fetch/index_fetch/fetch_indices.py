import requests
import json
import gzip
import io
from datetime import datetime
from db_pool import get_connection
import os
import time
from dotenv import load_dotenv
from utils.pretty_log import console, banner, status_ok, status_warn, status_err, rule, updates_table
from services.http_client import upstox_get

# Ensure .env is loaded so we can use user's real environment variables
load_dotenv()

# Load your Upstox token from environment variables
UPSTOX_TOKEN = os.environ.get("UPSTOX_ACCESS_TOKEN")

# Map of index display names to Upstox instrument keys (will be resolved from BOD instruments if possible)
# Using exact Upstox trading symbols for resolution
INDEX_MAPPING = {
    "NIFTY 50": {
        "instrument_key": "NSE_INDEX|Nifty 50",  # Hardcoded - Upstox uses "Nifty 50" (with space, capital N)
        "tag": "Benchmark"
    },
    "BANKNIFTY": {
        "instrument_key": None,  # Resolves to "Nifty Bank"
        "tag": "Banking"
    },
    "SENSEX": {
        "instrument_key": None,
        "tag": "Benchmark"
    },
    "FINNIFTY": {
        "instrument_key": None,  # Resolves to "Nifty Fin Service"
        "tag": "Sectoral"
    },
    "BANKEX": {
        "instrument_key": None,
        "tag": "Banking"
    },
    "SENSEX50": {
        "instrument_key": None,
        "tag": "Broader Market"
    },
    "NIFTY MIDCAP 50": {  # Changed from MIDCAPNIFTY - exact Upstox symbol
        "instrument_key": None,
        "tag": "Broader Market"
    },
    "NIFTY NEXT 50": {  # Changed from NIFTYNXT50 - better display label
        "instrument_key": None,
        "tag": "Broader Market"
    },
    "INDIA VIX": {
        "instrument_key": None,
        "tag": "Volatility"
    }
}

# Keep a flag so we only resolve once per process
_INDEX_KEYS_RESOLVED = False

def _download_bod_instruments():
    """Download the BOD instruments JSON (gz) from Upstox assets."""
    import certifi
    url = "https://assets.upstox.com/market-quote/instruments/exchange/complete.json.gz"
    resp = requests.get(url, timeout=15, verify=certifi.where())
    resp.raise_for_status()
    with gzip.GzipFile(fileobj=io.BytesIO(resp.content)) as gz_file:
        instruments = json.loads(gz_file.read().decode("utf-8"))
    return instruments

def _resolve_index_instrument_keys():
    """Resolve instrument_key for indices based on BOD instruments list."""
    global _INDEX_KEYS_RESOLVED
    if _INDEX_KEYS_RESOLVED:
        return

    try:
        instruments = _download_bod_instruments()

        # Build lookup for INDEX instruments: {(segment_upper, trading_symbol_upper): instrument_key}
        index_lookup = {}
        for inst in instruments:
            segment = (inst.get("segment") or "").upper()
            # Only consider index segments (NSE_INDEX / BSE_INDEX)
            if not segment.endswith("_INDEX"):
                continue
            trading_symbol = (inst.get("trading_symbol") or "").upper()
            instrument_key = inst.get("instrument_key")
            if trading_symbol and instrument_key:
                index_lookup[(segment, trading_symbol)] = instrument_key
                # Uncomment for verbose listing
                # print(f"[DEBUG] INDEX: segment={segment}, trading_symbol={trading_symbol}, key={instrument_key}")

        # Map display names to potential trading symbols and preferred segment
        candidates = {
            "NIFTY 50": [("NSE_INDEX", "Nifty 50"), ("NSE_INDEX", "NIFTY 50"), ("NSE_INDEX", "NIFTY50"), ("NSE_INDEX", "NIFTY 50 PR 1X"), ("NSE_INDEX", "NIFTY 50 TR 1X")],
            "SENSEX": [("BSE_INDEX", "SENSEX"), ("BSE_INDEX", "BSE SENSEX")],
            "BANKNIFTY": [("NSE_INDEX", "NIFTY BANK"), ("NSE_INDEX", "BANKNIFTY")],
            "INDIA VIX": [("NSE_INDEX", "INDIA VIX")],
            "FINNIFTY": [("NSE_INDEX", "FINNIFTY")],
            "BANKEX": [("BSE_INDEX", "BANKEX")],
            "SENSEX50": [("BSE_INDEX", "SENSEX50")],
            "NIFTY MIDCAP 50": [("NSE_INDEX", "NIFTY MIDCAP 50")],
            "NIFTY NEXT 50": [("NSE_INDEX", "Nifty Next 50"), ("NSE_INDEX", "NIFTYNXT50")],
        }

        resolved = 0
        for display_name, info in INDEX_MAPPING.items():
            if info.get("instrument_key"):
                continue  # already set externally
            for seg, sym in candidates.get(display_name, []):
                key = index_lookup.get((seg, sym))
                if key:
                    INDEX_MAPPING[display_name]["instrument_key"] = key
                    resolved += 1
                    print(f"[✓] Resolved {display_name} -> {key}")
                    break
            if not INDEX_MAPPING[display_name]["instrument_key"]:
                # Fuzzy fallback: try to find by contains for tricky cases (e.g., NIFTY 50)
                try:
                    match_key = None
                    if display_name == "NIFTY 50":
                        # Collect candidates - looking for NIFTY 50 (not 500, not Next 50, not Alpha 50, etc.)
                        candidates_ik = []
                        import re
                        for (seg, sym), ik in index_lookup.items():
                            if seg == "NSE_INDEX" and ("NIFTY" in sym.upper() or "NIFTY" in sym):
                                # Must contain "50" but NOT as part of "500"
                                # Use word boundary matching
                                if re.search(r'\b50\b', sym):  # "50" as standalone word
                                    # Exclude unrelated NIFTY variants - be very strict
                                    exclude_words = ["BANK", "MID", "SML", "SMALL", "IT", "AUTO", "PHARMA", "FMCG", "METAL", "REALTY", "VIX", "NEXT", "ALPHA", "QUALITY", "VALUE", "GROWTH", "MOMENTUM", "DIV", "DIVIDEND", "OPPS", "LOW", "HIGH", "ENERGY", "INFRA", "COMMODIT", "CONSUM", "HEALTH", "FINANCE", "SERVICE"]
                                    if any(bad in sym.upper() for bad in exclude_words):
                                        continue
                                    # Exclude leveraged and inverse variants
                                    if any(bad in sym.upper() for bad in ["1X", "2X", "3X", "INV", "INVERSE", "LEVER"]):
                                        continue
                                    # Rank by preference
                                    rank = 3
                                    if sym.upper() == "NIFTY 50" or sym == "Nifty 50":
                                        rank = 0
                                    elif "PR" in sym and "1X" not in sym.upper():
                                        rank = 1
                                    elif "TR" in sym and "1X" not in sym.upper():
                                        rank = 2
                                    candidates_ik.append((rank, sym, ik))
                        if candidates_ik:
                            candidates_ik.sort(key=lambda t: (t[0], t[1]))
                            best = candidates_ik[0]
                            match_key = best[2]
                            print(f"[~] Fuzzy NIFTY 50 pick: {best[1]} (rank {best[0]})")
                    elif display_name == "BANKNIFTY":
                        for (seg, sym), ik in index_lookup.items():
                            if seg == "NSE_INDEX" and ("BANK" in sym) and ("NIFTY" in sym):
                                match_key = ik
                                break
                    
                    if match_key:
                        INDEX_MAPPING[display_name]["instrument_key"] = match_key
                        resolved += 1
                        print(f"[✓] Resolved {display_name} (fuzzy) -> {match_key}")
                    else:
                        print(f"[!] Could not resolve instrument_key for {display_name}. Tried: {candidates.get(display_name, [])}")
                except Exception as e:
                    print(f"[!] Fuzzy resolve failed for {display_name}: {e}")

        _INDEX_KEYS_RESOLVED = True
        print(f"[DEBUG] Total indices resolved: {resolved}/{len(INDEX_MAPPING)}")
    except Exception as e:
        print(f"[!] Failed to resolve index instrument keys: {e}")
        _INDEX_KEYS_RESOLVED = True  # avoid repeated attempts on every call


def fetch_index_quotes():
    """Fetch quotes for all indices from Upstox API in one batch call"""
    if not UPSTOX_TOKEN:
        print("[!] UPSTOX_ACCESS_TOKEN not set in environment")
        return None

    # Ensure instrument keys are resolved from BOD instruments
    _resolve_index_instrument_keys()

    # Get all instrument keys for batch request
    instrument_keys = [data["instrument_key"] for data in INDEX_MAPPING.values() if data.get("instrument_key")]
    if not instrument_keys:
        print("[!] No instrument keys available for indices")
        return None
    
    url = "https://api.upstox.com/v2/market-quote/quotes"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {UPSTOX_TOKEN}"
    }
    
    # Build query parameters (comma-separated instrument keys)
    params = {
        "instrument_key": ",".join(instrument_keys)
    }
    
    banner("Fetching Index Quotes", f"{len(instrument_keys)} instruments", style="bold cyan")
    
    try:
        response = upstox_get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        if data.get("status") == "success":
            status_ok("Successfully fetched index data")
            payload = data.get("data", {})
            try:
                sample_keys = list(payload.keys())[:5]
                print(f"[DEBUG] Upstox data keys sample: {sample_keys}")
            except Exception:
                pass
            return payload
        else:
            status_warn(f"API returned error: {data.get('errors', data)}")
            return None
            
    except requests.exceptions.HTTPError as e:
        status_err(f"HTTP Error: {e}, Status Code: {e.response.status_code}")
        if e.response.status_code == 401:
            status_err("Authentication failed. Check UPSTOX_ACCESS_TOKEN.")
        elif e.response.status_code == 429:
            status_warn("Rate limit exceeded. Backing off and will retry automatically if configured.")
        return None
    except requests.exceptions.ConnectionError:
        status_err("Network error: Failed to connect to Upstox API.")
        return None
    except requests.exceptions.RequestException as e:
        status_err(f"Request error: {e}")
        return None


def update_index_prices():
    """Update index prices in database"""
    conn = get_connection()
    cursor = conn.cursor()
    
    try:
        # Fetch quotes from Upstox
        quotes_data = fetch_index_quotes()
        if not quotes_data:
            status_warn("No data received from Upstox")
            return 0
        
        # Build a mapping from instrument_token to quote so we can match reliably
        token_to_quote = {}
        try:
            for k, v in quotes_data.items():
                token = v.get("instrument_token") or v.get("instrument_key") or k
                token_to_quote[str(token)] = v
            print(f"[DEBUG] Mapped {len(token_to_quote)} quotes by instrument_token")
        except Exception as e:
            print(f"[!] Failed to build token map: {e}")

        updated_count = 0
        pretty_rows = []

        for index_name, index_info in INDEX_MAPPING.items():
            instrument_key = index_info["instrument_key"]
            tag = index_info["tag"]
            
            # Get quote data for this index
            quote = token_to_quote.get(instrument_key)
            if not quote and instrument_key:
                # Try alternate key format: some responses use ':' instead of '|'
                alt_key = instrument_key.replace("|", ":")
                quote = quotes_data.get(alt_key) or token_to_quote.get(alt_key)
            if not quote and instrument_key:
                # As a last resort, try lookup by trailing symbol (after '|' or ':') and segment
                sym = instrument_key.split("|")[-1] if "|" in instrument_key else instrument_key.split(":")[-1]
                seg = instrument_key.split("|")[0] if "|" in instrument_key else instrument_key.split(":")[0]
                for k, v in quotes_data.items():
                    if sym.upper() in str(k).upper() and seg in str(k):
                        quote = v
                        break
            if not quote:
                status_warn(f"No data for {index_name} (key={instrument_key})")
                continue
            
            # Extract OHLC data (Upstox commonly uses 'ohlc': {open, high, low, close})
            ohlc = quote.get("ohlc", {}) or {}
            # last price may be under several keys depending on feed; try common ones
            ltp = quote.get("last_price") or quote.get("lastPrice") or quote.get("last") or None

            # prev_close may appear under ohlc.close or several alternate keys; try a list
            prev_close = None
            candidate_prev_keys = [
                lambda q: (q.get("ohlc") or {}).get("close"),
                lambda q: q.get("prev_close"),
                lambda q: q.get("previous_close"),
                lambda q: q.get("prevClose"),
                lambda q: q.get("previousClose"),
                lambda q: q.get("close"),
            ]
            for fn in candidate_prev_keys:
                try:
                    v = fn(quote)
                    if v is not None:
                        prev_close = v
                        break
                except Exception:
                    continue

            # Normalize types to floats where possible
            try:
                ltp = float(ltp) if ltp is not None else None
            except Exception:
                ltp = None

            try:
                prev_close = float(prev_close) if prev_close is not None else None
            except Exception:
                prev_close = None

            if ltp is None or prev_close is None:
                status_warn(f"Missing price data for {index_name} - ltp={ltp} prev_close={prev_close}")
                # For debugging, print a small sample of the quote (avoid huge dumps)
                try:
                    import json as _json
                    snippet = {k: quote.get(k) for k in list(quote.keys())[:10]}
                    console.log(f"Quote snippet for {index_name}: {_json.dumps(snippet, default=str)[:800]}")
                except Exception:
                    pass
                continue

            # First try provider-supplied change fields (providers often include net_change)
            change_value = None
            for ck in ("net_change", "netChange", "change", "change_value", "netChangeValue", "net_change_value"):
                try:
                    if ck in quote and quote.get(ck) is not None:
                        change_value = float(quote.get(ck))
                        break
                except Exception:
                    continue

            # Fall back to ltp - prev_close if provider didn't supply change
            if change_value is None:
                change_value = ltp - prev_close

            # Compute percent from chosen change_value
            try:
                change_percent = (change_value / prev_close) * 100 if prev_close != 0 else 0
            except Exception:
                change_percent = 0

            # If percent is zero but provider sent a net_change key, log for debugging
            if abs(change_percent) < 1e-12:
                # only log when there's evidence provider had change info or keys present
                provider_keys = [k for k in ("net_change", "netChange", "change", "change_value") if k in quote]
                if provider_keys:
                    try:
                        console.log(f"Computed zero percent for {index_name}: ltp={ltp}, prev_close={prev_close}, change_value={change_value}, provider_keys={provider_keys}")
                    except Exception:
                        pass
            
            # Insert or update in database
            sql = """
                INSERT INTO Index_Prices 
                (index_name, instrument_key, ltp, open_price, high_price, low_price, 
                 prev_close, change_value, change_percent, tag, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE
                    ltp = VALUES(ltp),
                    open_price = VALUES(open_price),
                    high_price = VALUES(high_price),
                    low_price = VALUES(low_price),
                    prev_close = VALUES(prev_close),
                    change_value = VALUES(change_value),
                    change_percent = VALUES(change_percent),
                    tag = VALUES(tag),
                    last_updated = NOW()
            """
            
            values = (
                index_name,
                instrument_key,
                ltp,
                ohlc.get("open"),
                ohlc.get("high"),
                ohlc.get("low"),
                prev_close,
                change_value,
                change_percent,
                tag
            )
            
            cursor.execute(sql, values)
            updated_count += 1
            pretty_rows.append({
                "name": index_name,
                "ltp": ltp,
                "change_percent": change_percent,
                "change_value": change_value,
                "tag": tag,
                "time": datetime.now().strftime("%H:%M:%S"),
            })

        # Commit all changes and report
        conn.commit()
        rule("Index Updates")
        updates_table(pretty_rows)
        status_ok(f"Successfully updated {updated_count} indices")
        return updated_count

    except Exception as e:
        status_err(f"Error updating index prices: {e}")
        conn.rollback()
        return -1
    finally:
        cursor.close()
        conn.close()


def run_continuous_fetch(interval_seconds=120):
    """Run continuous index price fetching every interval_seconds"""
    banner("Index Fetcher Running", f"Every {interval_seconds}s", style="bold magenta")
    
    while True:
        try:
            update_index_prices()
            status_ok(f"Next update in {interval_seconds} seconds...")
            time.sleep(interval_seconds)
        except KeyboardInterrupt:
            print("\n[!] Stopping index fetcher...")
            break
        except Exception as e:
            print(f"[!] Unexpected error: {e}")
            print(f"[⏰] Retrying in {interval_seconds} seconds...")
            time.sleep(interval_seconds)


if __name__ == "__main__":
    # Run immediately once, then continuously
    update_index_prices()
    run_continuous_fetch(interval_seconds=120)