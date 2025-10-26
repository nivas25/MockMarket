import React from "react";
import styles from "./MarketSentiment.module.css";

export interface SentimentData {
  overall: "bullish" | "bearish" | "neutral";
  score: number; // 0-100
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
  timestamp?: string;
}

interface MarketSentimentProps {
  data: SentimentData;
  trend?: "up" | "down" | "flat"; // optional, for tiny arrow indicator
  previousScore?: number; // optional, to auto-derive trend if provided
}

export const MarketSentiment: React.FC<MarketSentimentProps> = ({
  data,
  trend,
  previousScore,
}) => {
  const label =
    data.overall === "bullish"
      ? "Bullish"
      : data.overall === "bearish"
      ? "Bearish"
      : "Neutral";

  // derive trend if not provided and previousScore exists
  let effectiveTrend: "up" | "down" | "flat" = trend ?? "flat";
  if (!trend && typeof previousScore === "number") {
    const delta = data.score - previousScore;
    if (delta >= 2) effectiveTrend = "up";
    else if (delta <= -2) effectiveTrend = "down";
    else effectiveTrend = "flat";
  }

  const tooltip = `Bullish ${data.bullishPercent}% · Neutral ${data.neutralPercent}% · Bearish ${data.bearishPercent}%`;

  return (
    <div className={styles.container}>
      {/* Ultra-minimal sentiment chip */}
      <div
        className={`${styles.chip} ${styles[data.overall]}`}
        role="status"
        aria-label={`Market sentiment ${label} ${data.score}`}
        title={tooltip}
      >
        <span className={styles.dot} aria-hidden="true" />
        <span className={styles.chipLabel}>{label}</span>
        {effectiveTrend !== "flat" && (
          <span
            className={`${styles.trend} ${
              effectiveTrend === "up" ? styles.trendUp : styles.trendDown
            }`}
            aria-hidden="true"
          />
        )}
        <span className={styles.sep} aria-hidden="true">
          ·
        </span>
        <span className={styles.chipScore}>{data.score}</span>
      </div>

      {data.timestamp && (
        <div className={styles.timestamp}>Updated {data.timestamp}</div>
      )}
    </div>
  );
};
