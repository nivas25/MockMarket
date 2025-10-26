"use client";

import styles from "./StockStats.module.css";

type StockData = {
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  previousClose: number;
  volume: number;
  marketCap: string;
  peRatio: number;
  week52High: number;
  week52Low: number;
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

  const formatVolume = (vol: number) => {
    if (vol >= 10000000) {
      return `${(vol / 10000000).toFixed(2)} Cr`;
    } else if (vol >= 100000) {
      return `${(vol / 100000).toFixed(2)} L`;
    }
    return vol.toLocaleString("en-IN");
  };

  return (
    <div className={styles.statsContainer}>
      <h2 className={styles.title}>Market Statistics</h2>

      <div className={styles.statsGrid}>
        {/* Day Statistics */}
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
          <div className={styles.statValue}>₹{formatNumber(stock.dayHigh)}</div>
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

        {/* Volume & Market Data */}
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
                <path d="M6 18V9" />
                <path d="M12 18V5" />
                <path d="M18 18v-7" />
              </svg>
            </span>
            <div className={styles.statLabel}>Volume</div>
          </div>
          <div className={styles.statValue}>{formatVolume(stock.volume)}</div>
        </div>

        <div className={`${styles.statCard} ${styles.cardPurple}`}>
          <div className={styles.statHead}>
            <span
              className={`${styles.icon} ${styles.iconPurple}`}
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
                <ellipse cx="12" cy="6" rx="6" ry="2.5" />
                <path d="M6 6v6c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6" />
                <path d="M6 12v6c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-6" />
              </svg>
            </span>
            <div className={styles.statLabel}>Market Cap</div>
          </div>
          <div className={styles.statValue}>₹{stock.marketCap}</div>
        </div>

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
                <path d="M7 12h10" />
                <path d="M5 12h2" />
                <path d="M17 12h2" />
                <path d="M8 12c0-3 1-6 4-6s4 3 4 6-1 6-4 6-4-3-4-6z" />
              </svg>
            </span>
            <div className={styles.statLabel}>P/E Ratio</div>
          </div>
          <div className={styles.statValue}>{stock.peRatio.toFixed(2)}</div>
        </div>

        {/* 52 Week Range */}
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
                <path d="M8 18l4-10 4 6 2-3" />
                <path d="M4 18h16" />
              </svg>
            </span>
            <div className={styles.statLabel}>52W High</div>
          </div>
          <div className={styles.statValue}>
            ₹{formatNumber(stock.week52High)}
          </div>
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
                <circle cx="12" cy="12" r="8" />
                <path d="M15 9l-6 6" />
              </svg>
            </span>
            <div className={styles.statLabel}>52W Low</div>
          </div>
          <div className={styles.statValue}>
            ₹{formatNumber(stock.week52Low)}
          </div>
        </div>
      </div>
    </div>
  );
}
