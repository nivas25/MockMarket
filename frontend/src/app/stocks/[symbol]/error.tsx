"use client";

import { useEffect } from "react";
import styles from "./StockDetail.module.css";

export default function StockError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Stock page error:", error);
  }, [error]);

  return (
    <div className={styles.stockPage}>
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.5, marginBottom: 16 }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.errorMessage}>
            {error.message || "Unable to load stock details."}
          </p>
          <button className={styles.errorButton} onClick={reset} type="button">
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
