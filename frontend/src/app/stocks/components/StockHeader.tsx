"use client";

import styles from "./StockHeader.module.css";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";

type StockData = {
  symbol: string;
  companyName: string;
  exchange: string;
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  changeValue: number;
};

type StockHeaderProps = {
  stock: StockData;
};

export default function StockHeader({ stock }: StockHeaderProps) {
  const live = useRealtimePrices([stock.symbol]);
  const liveLtp = live[stock.symbol?.toUpperCase()]?.ltp;
  const current = typeof liveLtp === "number" ? liveLtp : stock.currentPrice;
  const changeValue = typeof liveLtp === "number" && typeof stock.previousClose === "number"
    ? liveLtp - stock.previousClose
    : stock.changeValue;
  const changePercent = typeof liveLtp === "number" && typeof stock.previousClose === "number" && stock.previousClose !== 0
    ? ((liveLtp - stock.previousClose) / stock.previousClose) * 100
    : stock.changePercent;
  const isPositive = (changePercent ?? 0) >= 0;
  const priceParts = current
    .toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .split(".");
  const intPart = priceParts[0] ?? "0";
  const fracPart = priceParts[1] ?? "00";
  const initials = stock.companyName?.[0]?.toUpperCase() || "";

  return (
    <div className={styles.header}>
      {/* Identity block */}
      <div className={styles.identity}>
        <div className={styles.logo}>{initials}</div>
        <div className={styles.titleBlock}>
          <h1 className={styles.companyName}>{stock.companyName}</h1>
          <div className={styles.metaRow}>
            <span className={styles.symbolChip}>{stock.symbol}</span>
            <span className={styles.dotSep} />
            <span className={styles.exchangeChip}>{stock.exchange}</span>
          </div>
        </div>
      </div>

      {/* Price block */}
      <div className={styles.priceBlock}>
        <div className={styles.currentPrice}>
          <div className={styles.priceRow}>
            <span className={styles.rupee}>₹</span>
            <span className={styles.priceInt}>{intPart}</span>
            <span className={styles.priceFrac}>.{fracPart}</span>
          </div>
        </div>
        <div
          className={`${styles.change} ${
            isPositive ? styles.positive : styles.negative
          }`}
        >
          <span className={styles.arrow}>{isPositive ? "▲" : "▼"}</span>
          <span className={styles.changeValue}>₹{Math.abs(changeValue || 0).toFixed(2)}</span>
          <span className={styles.changePercent}>
            ({isPositive ? "+" : ""}{(changePercent || 0).toFixed(2)}%)
          </span>
        </div>
      </div>
    </div>
  );
}
