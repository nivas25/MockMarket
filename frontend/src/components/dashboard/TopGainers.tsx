"use client";
import React from "react";
import styles from "./TopGainers.module.css";
import widget from "./DashboardWidgets.module.css";
import type { StockMover } from "../../app/dashboard/types";

export type TopGainersProps = {
  items: StockMover[];
  limit?: number;
};

function parseChangePercent(change: string): number {
  // expects formats like "+2.45%" or "-1.2%"; fallback 0
  const m = change.match(/([-+]?\d+(?:\.\d+)?)%/);
  return m ? parseFloat(m[1]) : 0;
}

export function TopGainers({ items, limit = 5 }: TopGainersProps) {
  // sort by percent descending, then take top N
  const sorted = [...items]
    .map((it) => ({ ...it, pct: parseChangePercent(it.change) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, limit);

  return (
    <div className={styles.list}>
      {sorted.map((stock, idx) => (
        <div className={widget.stockRow} key={`${stock.symbol}-${idx}`}>
          <div className={styles.leading}>
            <span className={styles.rankBadge}>{idx + 1}</span>
            <div className={widget.stockInfo}>
              <div className={styles.symbolRow}>
                <span className={styles.symbol}>{stock.symbol}</span>
                <span className={styles.name} title={stock.name}>
                  {stock.name}
                </span>
              </div>
            </div>
          </div>
          <div className={styles.trailing}>
            <div className={widget.stockPrice}>₹{stock.price}</div>
            <div className={`${widget.changePill} ${widget.pillPositive}`}>
              {stock.change}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
