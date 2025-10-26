import styles from "./OrdersTab.module.css";
import type { Order } from "../../app/dashboard/types";
import { useMemo, useState } from "react";

type OrdersTabProps = {
  orders: Order[];
};

export function OrdersTab({ orders }: OrdersTabProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<
    "All" | "Pending" | "Completed" | "Cancelled"
  >("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (orders || []).filter((o) => {
      const byStatus = status === "All" ? true : o.status === status;
      const byQuery = !q || o.name.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
  }, [orders, query, status]);

  const counts = useMemo(() => {
    const c = {
      All: orders.length,
      Pending: 0,
      Completed: 0,
      Cancelled: 0,
    } as Record<string, number>;
    for (const o of orders) c[o.status]++;
    return c;
  }, [orders]);

  return (
    <section className={styles.ordersWrap}>
      <header className={styles.headerRow}>
        <h2 className={styles.title}>Orders</h2>
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
              placeholder="Search by symbol"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className={styles.filterRow}>
        {(["All", "Pending", "Completed", "Cancelled"] as const).map((s) => (
          <button
            key={s}
            className={`${styles.filterChip} ${
              status === s ? styles.filterChipActive : ""
            }`}
            onClick={() => setStatus(s)}
          >
            <span className={styles.dot} data-kind={s.toLowerCase()} />
            {s}
            <span className={styles.count}>{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Desktop table */}
      <div className={styles.tableContainer}>
        {filtered.length ? (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.tr}>
                <th>Symbol</th>
                <th>Side</th>
                <th className={styles.tdRight}>Qty</th>
                <th className={styles.tdRight}>Price</th>
                <th className={styles.tdRight}>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {filtered.map((order, idx) => {
                const value =
                  Number(order.price?.toString().replace(/[^0-9.]/g, "")) *
                    order.qty || 0;
                const isBuy = order.type === "BUY";
                const statusClass =
                  order.status === "Completed"
                    ? styles.statusCompleted
                    : order.status === "Pending"
                    ? styles.statusPending
                    : styles.statusCancelled;
                return (
                  <tr key={`${order.name}-t-${idx}`} className={styles.tr}>
                    <td>{order.name}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          isBuy ? styles.sideBuy : styles.sideSell
                        }`}
                      >
                        {order.type}
                      </span>
                    </td>
                    <td className={`${styles.tdRight} ${styles.mono}`}>
                      {order.qty}
                    </td>
                    <td className={`${styles.tdRight} ${styles.mono}`}>
                      ₹{order.price}
                    </td>
                    <td className={`${styles.tdRight} ${styles.mono}`}>
                      ₹{formatINR(value)}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${statusClass}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      {order.status === "Pending" ? (
                        <span className={styles.tableActions}>
                          <button
                            className={`${styles.actionBtn} ${styles.ghostBtn}`}
                          >
                            Modify
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.dangerBtn}`}
                          >
                            Cancel
                          </button>
                        </span>
                      ) : order.status === "Completed" ? (
                        <span className={styles.tableActions}>
                          <button
                            className={`${styles.actionBtn} ${styles.primaryBtn}`}
                          >
                            Reorder
                          </button>
                        </span>
                      ) : (
                        <span className={styles.tableActions}>
                          <button className={styles.actionBtn} disabled>
                            —
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
              </svg>
            </div>
            <div className={styles.emptyTitle}>No orders</div>
            <div className={styles.emptyText}>
              Place a BUY or SELL order to see it here.
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className={styles.listWrap}>
        {filtered.length ? (
          filtered.map((order, idx) => {
            const value =
              Number(order.price?.toString().replace(/[^0-9.]/g, "")) *
                order.qty || 0;
            const isBuy = order.type === "BUY";
            const statusClass =
              order.status === "Completed"
                ? styles.statusCompleted
                : order.status === "Pending"
                ? styles.statusPending
                : styles.statusCancelled;
            return (
              <article key={`${order.name}-${idx}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.tickerBlock}>
                    <div
                      className={`${styles.sidePill} ${
                        isBuy ? styles.buy : styles.sell
                      }`}
                    >
                      {order.type}
                    </div>
                    <div className={styles.tickerName}>{order.name}</div>
                  </div>
                  <div className={`${styles.statusPill} ${statusClass}`}>
                    {order.status}
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.metricCell}>
                    <div className={styles.metricLabel}>Quantity</div>
                    <div className={styles.metricValue}>{order.qty}</div>
                  </div>
                  <div className={styles.metricCell}>
                    <div className={styles.metricLabel}>Price</div>
                    <div className={styles.metricValue}>₹{order.price}</div>
                  </div>
                  <div className={styles.metricCell}>
                    <div className={styles.metricLabel}>Order value</div>
                    <div className={styles.metricValue}>
                      ₹{formatINR(value)}
                    </div>
                  </div>
                </div>
                {order.status === "Pending" && (
                  <div className={styles.progressRow}>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressBar}
                        style={{ width: "35%" }}
                      />
                    </div>
                    <div className={styles.progressText}>Pending • 35%</div>
                  </div>
                )}
                <div className={styles.cardActions}>
                  {order.status === "Pending" ? (
                    <>
                      <button
                        className={`${styles.actionBtn} ${styles.ghostBtn}`}
                      >
                        Modify
                      </button>
                      <button
                        className={`${styles.actionBtn} ${styles.dangerBtn}`}
                      >
                        Cancel
                      </button>
                    </>
                  ) : order.status === "Completed" ? (
                    <button
                      className={`${styles.actionBtn} ${styles.primaryBtn}`}
                    >
                      Reorder
                    </button>
                  ) : (
                    <button className={`${styles.actionBtn}`} disabled>
                      —
                    </button>
                  )}
                </div>
              </article>
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
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
              </svg>
            </div>
            <div className={styles.emptyTitle}>No orders</div>
            <div className={styles.emptyText}>
              Place a BUY or SELL order to see it here.
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}
