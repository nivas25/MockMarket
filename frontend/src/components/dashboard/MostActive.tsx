"use client";
import React from "react";
import styles from "./MostActive.module.css";
import widget from "./DashboardWidgets.module.css";
import type { ActiveStock } from "../../app/dashboard/types";

export type MostActiveProps = {
  items: ActiveStock[];
  limit?: number;
};

export function MostActive({ items, limit = 5 }: MostActiveProps) {
  const displayItems = items.slice(0, limit);

  return (
    <div className={styles.list}>
      {displayItems.map((stock, idx) => {
        const isPositive = stock.change.startsWith("+");
        return (
          <div className={widget.stockRow} key={`${stock.symbol}-${idx}`}>
            <div className={styles.leading}>
              <span className={styles.rankBadge}>{idx + 1}</span>
              <div className={widget.stockInfo}>
                <div className={styles.symbolRow}>
                  <span className={styles.symbol}>{stock.symbol}</span>
                  <span
                    className={styles.volume}
                    title={`Volume: ${stock.volume}`}
                  >
                    Vol: {stock.volume}
                  </span>
                </div>
                <div className={styles.name}>{stock.name}</div>
              </div>
            </div>
            <div className={styles.trailing}>
              <div className={widget.stockPrice}>₹{stock.price}</div>
              <div
                className={`${widget.changePill} ${
                  isPositive ? widget.pillPositive : widget.pillNegative
                }`}
              >
                {stock.change}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
