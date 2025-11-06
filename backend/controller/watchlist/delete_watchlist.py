from db_pool import get_connection

def delete_watchlist(watchlist_id: int):
    print("Deleting watchlist with ID:", watchlist_id)
    conn = get_connection()
    if not conn:
        return {"status": "error", "message": "Database connection failed"}

    try:
        with conn.cursor() as cursor:
            delete_query = "DELETE FROM Watchlist WHERE watchlist_id = %s"
            cursor.execute(delete_query, (watchlist_id,))
            conn.commit()

            if cursor.rowcount > 0:
                print(f"Watchlist {watchlist_id} deleted successfully.")
                return {"status": "success", "message": f"Watchlist {watchlist_id} deleted successfully"}
            else:
                print(f"No watchlist found with ID {watchlist_id}.")
                return {"status": "error", "message": f"No watchlist found with ID {watchlist_id}"}

    except Exception as e:
        print("Error deleting watchlist:", e)
        return {"status": "error", "message": f"An error occurred while deleting watchlist: {str(e)}"}

    finally:
        conn.close()
