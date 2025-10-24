import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../')))
from db_pool import get_connection

def update_stocks_table(instruments):
    if not instruments:
        print("[DB-UPDATER] No instruments provided. Exiting.")
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Prepare query
    query = """
    INSERT INTO Stocks (symbol, isin, company_name, exchange)
    VALUES (%s, %s, %s, %s)
    ON DUPLICATE KEY UPDATE
        company_name=VALUES(company_name),
        exchange=VALUES(exchange)
    """

    # Prepare values
    values = [
        (
            inst['symbol'],
            inst['isin'],
            inst['company_name'],
            inst['exchange']
        )
        for inst in instruments
    ]

    try:
        # Execute batch insert/update
        cursor.executemany(query, values)
        conn.commit()

        # MySQL doesn’t give exact inserted vs updated count easily
        print(f"[DB-UPDATER] Processed {len(instruments)} instruments.")
        print(f"[DB-UPDATER] {cursor.rowcount} rows affected (inserted + updated).")

    except Exception as e:
        conn.rollback()
        print(f"[DB-UPDATER] Error: {e}")

    finally:
        cursor.close()
        conn.close()

    print("[DB-UPDATER] Database update completed successfully!")
