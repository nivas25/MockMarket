import styles from "./WatchlistTab.module.css";
import type { StockMover } from "../../app/dashboard/types";
import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { url } from "../../config.js";

type WatchlistTabProps = {
  watchlist: StockMover[];
};

type WatchlistItem = {
  watchlist_id: number;
  watchlist_name: string;
  stocks: Array<{
    stock_name: string;
    current_price: string | number | null;
  }>;
};

export function WatchlistTab({ watchlist }: WatchlistTabProps) {
  const [query, setQuery] = useState("");
  const [fetchedWatchlists, setFetchedWatchlists] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    const fetchWatchlists = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setError("No authentication token found. Please log in.");
        setLoading(false);
        return;
      }

      try {
        const decode = jwtDecode(token) as any;
        const user_id = decode?.sub?.user_id;

        if (!user_id) {
          setError("Invalid authentication token.");
          setLoading(false);
          return;
        }

        const response = await axios.post(`${url}/fetch/watchlists`, { user_id });
        console.log("Watchlist response:", response.data);

        if (response.data.status === "success") {
          setFetchedWatchlists(response.data.data);
        } else {
          setError(response.data.message || "Failed to fetch watchlists.");
        }
      } catch (err: any) {
        console.error("Error fetching watchlists:", err);
        setError(err.response?.data?.message || "Failed to fetch watchlists. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchWatchlists();
  }, []);

  // Flatten all stocks from watchlists for simple display
  const allStocks = useMemo(() => {
    return fetchedWatchlists.flatMap((wl) => {
      if (!wl.stocks || wl.stocks.length === 0) return [];
      return wl.stocks.map((stock) => ({
        name: stock.stock_name.trim(),
        price: stock.current_price || 0,
        watchlist_id: wl.watchlist_id,
        watchlist_name: wl.watchlist_name,
      }));
    });
  }, [fetchedWatchlists]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allStocks.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q)
    );
  }, [allStocks, query]);

  // Fake sparkline data generator (simple line for price movement)
  const generateSparklineData = (name: string) => {
    const seed = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const points = Array.from({ length: 20 }, (_, i) => {
      const base = 1000 + (seed % 500);
      const variation = Math.sin(i * 0.5 + seed % 10) * 50;
      return base + variation;
    });
    return points;
  };

  const renderSparkline = (name: string, price: number) => {
    const data = generateSparklineData(name);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    return (
      <svg
        className={styles.sparkline}
        width="80"
        height="20"
        viewBox="0 0 80 20"
      >
        <path
          d={`M0,10 ${data.map((d, i) => `${i * 4}, ${(20 - ((d - min) / range) * 20)}`).join(' L')} L80,10 Z`}
          fill="rgba(0, 179, 134, 0.15)"
          stroke="rgba(0, 179, 134, 0.85)"
          strokeWidth="1.5"
        />
      </svg>
    );
  };

 const handleRemoveStock = async (watchlistId: number) => {
  setRemovingId(watchlistId);
  try {
    console.log(`Deleting watchlist with ID: ${watchlistId}`);

    const response = await axios.delete(`${url}/delete/watchlist`, {
      data: { watchlist_id: watchlistId } // ✅ correct placement
    });

    console.log("Delete response:", response.data);

    if (response.data.status === "success") {
      alert("Watchlist deleted successfully!");
      // ✅ Instantly update UI
      setFetchedWatchlists((prev) =>
        prev.filter((wl) => wl.watchlist_id !== watchlistId)
      );
    } else {
      alert(response.data.message || "Failed to delete the watchlist.");
    }
  } catch (err: any) {
    console.error("Error deleting watchlist:", err);
    alert(
      err.response?.data?.message ||
      "An error occurred while deleting the watchlist."
    );
  } finally {
    setRemovingId(null);
  }
};



  if (loading) {
    return (
      <section className={styles.watchlistWrap}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Loading watchlists...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.watchlistWrap}>
        <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>
          {error}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.watchlistWrap}>
      <header className={styles.headerRow}>
        <h2 className={styles.title}>Watchlist</h2>
        <div className={styles.actionsRow}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Search your watchlist"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

        </div>
      </header>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th>Stock</th>
              <th>Graph</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filtered.length ? (
              filtered.map((stock, idx) => (
                <tr key={`${stock.name}-${idx}`} className={styles.tr}>
                  <td className={styles.tdStock}>
                    <div className={styles.name}>{stock.name}</div>
                    <div className={styles.price}>
                      ₹{typeof stock.price === 'number' ? stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : stock.price || 'N/A'}
                    </div>
                  </td>
                  <td className={styles.tdGraph}>
                    {renderSparkline(stock.name, stock.price)}
                  </td>
                  <td className={styles.tdActions}>
                    <button
                      className={`${styles.actionBtn} ${styles.removeBtn}`}
                      onClick={() => handleRemoveStock(stock.watchlist_id)}
                      disabled={removingId === stock.watchlist_id}
                    >
                      {removingId === stock.watchlist_id ? 'Please wait' : 'Remove'}
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className={styles.emptyWrap}>
                  <div className={styles.emptyIcon} aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="28"
                      height="28"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <path d="M6 3h12a2 2 0 0 1 2 2v14l-8-4-8 4V5a2 2 0 0 1 2-2z" />
                    </svg>
                  </div>
                  <div className={styles.emptyTitle}>No watchlist items</div>
                  <div className={styles.emptyText}>
                    Search and add stocks to build your watchlist.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}