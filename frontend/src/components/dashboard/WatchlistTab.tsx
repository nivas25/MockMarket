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
    stock_id: number;
    stock_name: string;
    stock_symbol: string;
    current_price: string | number | null;
  }>;
};

export function WatchlistTab({ watchlist }: WatchlistTabProps) {
  const [query, setQuery] = useState("");
  const [fetchedWatchlists, setFetchedWatchlists] = useState<WatchlistItem[]>(
    []
  );
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

        const response = await axios.post(`${url}/fetch/watchlists`, {
          user_id,
        });
        console.log("Watchlist response:", response.data);

        if (response.data.status === "success") {
          setFetchedWatchlists(response.data.data);
        } else {
          setError(response.data.message || "Failed to fetch watchlists.");
        }
      } catch (err: any) {
        console.error("Error fetching watchlists:", err);
        setError(
          err.response?.data?.message ||
            "Failed to fetch watchlists. Please try again."
        );
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
        stock_id: stock.stock_id,
        name: stock.stock_name.trim(),
        symbol: stock.stock_symbol.trim(),
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
        s.name.toLowerCase().includes(q) ||
        s.symbol.toLowerCase().includes(q)
    );
  }, [allStocks, query]);

  // Get userId once for remove operations
  const getUserId = (): number | null => {
    const token = localStorage.getItem("authToken");
    if (!token) return null;
    interface DecodedToken {
      sub: { user_id: number };
    }
    try {
      const decode = jwtDecode<DecodedToken>(token);
      return decode?.sub?.user_id || null;
    } catch {
      return null;
    }
  };

  const handleRemoveStock = async (stockId: number, userId: number) => {
    console.log("🔵 handleRemoveStock called with:", { stockId, userId });

    setRemovingId(stockId);
    try {
      const deleteUrl = `${url}/watchlist/remove-stock`;
      const deleteData = { user_id: userId, stock_id: stockId };

      console.log("🌐 Making DELETE request to:", deleteUrl);
      console.log("📤 Request data:", JSON.stringify(deleteData, null, 2));

      const response = await axios.delete(deleteUrl, {
        data: deleteData,
      });

      console.log("📥 Remove stock response:", response.data);

      if (response.data.success) {
        console.log("✅ Stock removed successfully, refreshing watchlist...");

        // ✅ Refresh the watchlists to reflect the change
        const token = localStorage.getItem("authToken");
        if (token) {
          interface DecodedToken {
            sub: { user_id: number };
          }
          const decode = jwtDecode<DecodedToken>(token);
          const user_id = decode?.sub?.user_id;

          if (user_id) {
            console.log("🔄 Fetching updated watchlist for user_id:", user_id);
            const refreshResponse = await axios.post(
              `${url}/fetch/watchlists`,
              { user_id }
            );
            console.log("📊 Refresh response:", refreshResponse.data);

            if (refreshResponse.data.status === "success") {
              setFetchedWatchlists(refreshResponse.data.data);
              console.log("✅ Watchlist UI updated successfully");
            }
          }
        }
      } else {
        console.error("❌ Failed to remove stock:", response.data.message);
        alert(
          response.data.message || "Failed to remove stock from watchlist."
        );
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      console.error("❌ Error removing stock:", error);
      alert(
        error.response?.data?.message ||
          "An error occurred while removing the stock."
      );
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <section className={styles.watchlistWrap}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          Loading watchlists...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.watchlistWrap}>
        <div style={{ textAlign: "center", padding: "2rem", color: "red" }}>
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
              <th>Symbol</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filtered.length ? (
              filtered.map((stock, idx) => {
                const userId = getUserId();
                const priceNum =
                  typeof stock.price === "number"
                    ? stock.price
                    : parseFloat(String(stock.price)) || 0;
                return (
                  <tr key={`${stock.stock_id}-${idx}`} className={styles.tr}>
                    <td className={styles.tdStock}>
                      <div className={styles.name}>{stock.name}</div>
                    </td>
                    <td className={styles.tdSymbol}>
                      <div className={styles.symbol}>{stock.symbol}</div>
                    </td>
                    <td className={styles.tdPrice}>
                      <div className={styles.price}>
                        ₹
                        {priceNum.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </td>
                    <td className={styles.tdActions}>
                      <button
                        className={`${styles.actionBtn} ${styles.removeBtn}`}
                        onClick={() =>
                          userId && handleRemoveStock(stock.stock_id, userId)
                        }
                        disabled={removingId === stock.stock_id || !userId}
                      >
                        {removingId === stock.stock_id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4} className={styles.emptyWrap}>
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
