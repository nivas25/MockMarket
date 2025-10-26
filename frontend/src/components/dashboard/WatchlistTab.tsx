import styles from "./WatchlistTab.module.css";
import type { StockMover } from "../../app/dashboard/types";
import { useMemo, useState } from "react";

type WatchlistTabProps = {
  watchlist: StockMover[];
};

export function WatchlistTab({ watchlist }: WatchlistTabProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (watchlist || []).filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.symbol.toLowerCase().includes(q)
    );
  }, [watchlist, query]);

  const toPct = (c: string) => {
    const m = c.match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : 0;
  };

  const seedFrom = (t: string) => {
    let n = 0;
    for (let i = 0; i < t.length; i++) n = (n * 131 + t.charCodeAt(i)) >>> 0;
    return n / 2 ** 32; // 0..1
  };

  const fakeVol = (sym: string) => {
    const s = seedFrom(sym);
    const base = 0.8 + s * 3.5; // 0.8..4.3
    return Math.round(base * 1_000_000);
  };

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
          <div className={styles.headerBtns}>
            <button className={`${styles.iconBtn} ${styles.goldBtn}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Add stocks
            </button>
            <button className={`${styles.iconBtn} ${styles.ghostBtn}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M4 21h4l11-11-4-4L4 17v4z"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
              Edit
            </button>
          </div>
        </div>
      </header>

      <div className={styles.tableHead}>
        <div className={styles.hCompany}>Company</div>
        <div className={styles.hPrice}>Market Price</div>
        <div className={styles.hChange}>1D Change</div>
        <div className={styles.hVol}>1D Volume</div>
        <div className={styles.hActions}>Actions</div>
      </div>

      <div className={styles.rows}>
        {filtered.length ? (
          filtered.map((s, idx) => {
            const chg = toPct(s.change);
            const up = chg > 0;
            const vol = fakeVol(s.symbol).toLocaleString("en-IN");
            return (
              <div key={`${s.symbol}-${idx}`} className={styles.row}>
                <div className={styles.cellCompany}>
                  <div className={styles.coText}>
                    <div className={styles.name}>{s.name}</div>
                    <div className={styles.symbol}>{s.symbol}</div>
                  </div>
                </div>
                <div className={styles.cellPrice}>
                  <span className={styles.mobileLabel}>Market Price</span>₹
                  {s.price}
                </div>
                <div
                  className={`${styles.cellChange} ${
                    up ? styles.pos : styles.neg
                  }`}
                >
                  <span className={styles.mobileLabel}>1D Change</span>
                  {up ? "+" : ""}
                  {chg.toFixed(2)}%
                </div>
                <div className={styles.cellVol}>
                  <span className={styles.mobileLabel}>1D Volume</span>
                  {vol}
                </div>
                <div className={styles.cellActions}>
                  <button className={`${styles.actionBtn} ${styles.buyBtn}`}>
                    Buy
                  </button>
                  <button className={`${styles.actionBtn} ${styles.sellBtn}`}>
                    Sell
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className={styles.emptyWrap}>
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
          </div>
        )}
      </div>
    </section>
  );
}
