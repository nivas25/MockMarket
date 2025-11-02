"use client";

import styles from "./StockStats.module.css";

type StockData = {
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  previousClose: number;
  currentPrice: number;
  changePercent: number;
  changeValue: number;
};

type StockStatsProps = {
  stock: StockData;
};

export default function StockStats({ stock }: StockStatsProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const isPositive = stock.changeValue >= 0;

  return (
    <div className={styles.statsContainer}>
      <h2 className={styles.title}>Market Statistics</h2>

      <div className={styles.statsGrid}>
        {/* Current Price Card */}
        <div className={`${styles.statCard} ${styles.cardAmber}`}>
          <div className={styles.statHead}>
            <span
              className={`${styles.icon} ${styles.iconAmber}`}
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12V7H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-2m-9-3V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" />
              </svg>
            </span>
            <div className={styles.statLabel}>Current Price</div>
          </div>
          <div className={styles.statValue}>
            ₹{formatNumber(stock.currentPrice)}
          </div>
        </div>

        {/* Today's Change Card (Dynamic Color) */}
        <div
          className={`${styles.statCard} ${
            isPositive ? styles.cardGreen : styles.cardRed
          }`}
        >
          <div className={styles.statHead}>
            <span
              className={`${styles.icon} ${
                isPositive ? styles.iconGreen : styles.iconRed
              }`}
              aria-hidden="true"
            >
              {isPositive ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17L17 7" />
                  <path d="M9 7h8v8" />
                </svg>
              ) : (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 7l10 10" />
                  <path d="M7 9v-2h2" />
                  <path d="M15 15h2v-2" />
                </svg>
              )}
            </span>
            <div className={styles.statLabel}>Today's Change</div>
          </div>
          <div className={styles.statValue}>
            {stock.changeValue.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
          </div>
        </div>

        {/* --- Existing Cards --- */}
        <div className={`${styles.statCard} ${styles.cardGreen}`}>
          <div className={styles.statHead}>
            <span
              className={`${styles.icon} ${styles.iconGreen}`}
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 17L17 7" />
                <path d="M9 7h8v8" />
              </svg>
            </span>
            <div className={styles.statLabel}>Day High</div>
          </div>
          {/* --- THIS IS THE FIX --- */}
          <div className={styles.statValue}>₹{formatNumber(stock.dayHigh)}</div>
          {/* --------------------- */}
        </div>

        <div className={`${styles.statCard} ${styles.cardRed}`}>
          <div className={styles.statHead}>
            <span
              className={`${styles.icon} ${styles.iconRed}`}
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 7l10 10" />
                <path d="M7 9v-2h2" />
                <path d="M15 15h2v-2" />
              </svg>
            </span>
            <div className={styles.statLabel}>Day Low</div>
          </div>
          <div className={styles.statValue}>₹{formatNumber(stock.dayLow)}</div>
        </div>

        <div className={`${styles.statCard} ${styles.cardBlue}`}>
          <div className={styles.statHead}>
            <span
              className={`${styles.icon} ${styles.iconBlue}`}
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7v5l3 3" />
              </svg>
            </span>
            <div className={styles.statLabel}>Open</div>
          </div>
          <div className={styles.statValue}>₹{formatNumber(stock.dayOpen)}</div>
        </div>

        <div className={`${styles.statCard} ${styles.cardGray}`}>
          <div className={styles.statHead}>
            <span
              className={`${styles.icon} ${styles.iconGray}`}
              aria-hidden="true"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7l8-4 8 4" />
                <path d="M4 7v10l8 4 8-4V7" />
                <path d="M4 12l8 4 8-4" />
              </svg>
            </span>
            <div className={styles.statLabel}>Prev. Close</div>
          </div>
          <div className={styles.statValue}>
            ₹{formatNumber(stock.previousClose)}
          </div>
        </div>
      </div>
    </div>
  );
}
