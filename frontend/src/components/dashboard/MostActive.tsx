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
      {displayItems.length === 0 && (
        <>
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className={widget.stockRow} aria-busy="true">
              <div className={styles.leading}>
                <span className={styles.rankBadge}>{i + 1}</span>
                <div className={widget.stockInfo}>
                  <div className={styles.symbolRow}>
                    <span
                      style={{
                        display: "inline-block",
                        width: 56,
                        height: 14,
                        borderRadius: 6,
                        background: "rgba(0,0,0,0.08)",
                      }}
                    />
                  </div>
                  <div
                    className={styles.name}
                    style={{
                      width: 120,
                      height: 12,
                      borderRadius: 6,
                      background: "rgba(0,0,0,0.06)",
                    }}
                  />
                </div>
              </div>
              <div className={styles.trailing}>
                <div
                  style={{
                    width: 54,
                    height: 12,
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.06)",
                  }}
                />
                <div className={widget.changePill} style={{ opacity: 0.5 }}>
                  —
                </div>
              </div>
            </div>
          ))}
        </>
      )}
      {displayItems.map((stock, idx) => {
        const isPositive = stock.change.startsWith("+");
        return (
          <div className={widget.stockRow} key={`${stock.symbol}-${idx}`}>
            <div className={styles.leading}>
              <span className={styles.rankBadge}>{idx + 1}</span>
              <div className={widget.stockInfo}>
                <div className={styles.symbolRow}>
                  <span className={styles.symbol}>{stock.symbol}</span>
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
