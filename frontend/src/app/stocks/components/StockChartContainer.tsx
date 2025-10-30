"use client";

import { useState } from "react";
import styles from "../[symbol]/StockDetail.module.css"; // Using the main page's CSS module
import ModernStockChart from "./ModernStockChart";
import StockChart from "./StockChart"; // The "normal" line chart

type Props = {
  symbol: string;
  currentPrice: number;
};

export default function StockChartContainer({ symbol, currentPrice }: Props) {
  const [chartType, setChartType] = useState<"candle" | "line">("candle");

  return (
    <div className={styles.chartSection}>
      <div className={styles.chartToolbar}>
        {/* The Toggle Buttons */}
        <div className={styles.chartToggleContainer}>
          <button
            onClick={() => setChartType("candle")}
            className={`${styles.chartToggleButton} ${
              chartType === "candle" ? styles.active : ""
            }`}
          >
            Candle
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`${styles.chartToggleButton} ${
              chartType === "line" ? styles.active : ""
            }`}
          >
            Line
          </button>
        </div>
      </div>

      {/* Conditionally render the correct chart */}
      {chartType === "candle" && (
        <ModernStockChart symbol={symbol} currentPrice={currentPrice} />
      )}

      {chartType === "line" && <StockChart symbol={symbol} />}
    </div>
  );
}
