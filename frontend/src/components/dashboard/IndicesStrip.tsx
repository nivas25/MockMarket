"use client";

import { useEffect, useState, useRef } from "react";
// Link removed; view-all now opens modal
import styles from "./IndicesStrip.module.css";
import { TrendingDownIcon, TrendingUpIcon } from "./Icons";
import { fetchAllIndices, type IndexData } from "@/services/api/indexApi";

export function IndicesStrip() {
  const [indices, setIndices] = useState<IndexData[] | null>(null);

  const loadIndices = async () => {
    try {
      // fetchAllIndices returns grouped indices by tag — flatten for the strip
      const grouped = await fetchAllIndices();
      const flat: IndexData[] = Object.values(grouped).flat();
      setIndices(flat);
    } catch (err) {
      console.error("Failed to fetch indices:", err);
    }
  };

  useEffect(() => {
    // Initial load
    (async () => {
      await loadIndices();
    })();

    // Refresh every 10 seconds for a more live feel
    const interval = setInterval(() => {
      loadIndices();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const scrollTimer = useRef<number | null>(null);
  const [showScrollbar, setShowScrollbar] = useState(false);

  const getTag = (tagFromBackend?: string, name?: string): string => {
    // Prefer backend tag; fallback to name-based logic
    if (tagFromBackend) return tagFromBackend;

    switch (name) {
      case "NIFTY 50":
        return "Benchmark";
      case "SENSEX":
        return "Benchmark";
      case "BANKNIFTY":
        return "Banking";
      case "INDIA VIX":
        return "Volatility";
      default:
        return "Index";
    }
  };

  const renderValue = (raw: string) => {
    // Split value into integer and decimal parts for styling
    const [intPart, decPart] = raw.split(".");
    return (
      <span className={styles.indexValue}>
        <span className={styles.valueInteger}>{intPart}</span>
        {decPart !== undefined && (
          <span className={styles.valueDecimal}>.{decPart}</span>
        )}
      </span>
    );
  };

  const formatPercent = (val?: number, fallback?: string) => {
    if (typeof val !== "number") return fallback ?? "";
    const abs = Math.abs(val);
    // Use 3 decimals for tiny moves to avoid showing +0.00%
    const decimals = abs > 0 && abs < 0.01 ? 3 : 2;
    const sign = val >= 0 ? "+" : "";
    return `${sign}${val.toFixed(decimals)}%`;
  };

  const formatValue = (valNum?: number, fallback?: string) => {
    if (typeof valNum !== "number") return fallback ?? "";
    return valNum.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Clear any pending scroll timer when component unmounts
  useEffect(() => {
    return () => {
      if (scrollTimer.current) {
        try {
          window.clearTimeout(scrollTimer.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return (
    <>
      <div className={styles.indicesHeader}>
        <div className={styles.indicesHeading}>Market Indices</div>
      </div>
      <div
        ref={stripRef}
        className={`${styles.indicesStrip} ${
          showScrollbar ? styles.showScrollbar : ""
        }`}
        onScroll={() => {
          setShowScrollbar(true);
          if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
          // hide after a short delay of inactivity
          scrollTimer.current = window.setTimeout(() => {
            setShowScrollbar(false);
          }, 800) as unknown as number;
        }}
        onMouseEnter={() => setShowScrollbar(true)}
        onMouseLeave={() => setShowScrollbar(false)}
      >
        {!indices && (
          <>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.indexCard} aria-busy="true">
                <div className={styles.indexHeader}>
                  <span className={styles.indexTitle}>
                    <span className={styles.liveDot} />
                    <span className={styles.indexName}>Loading…</span>
                  </span>
                  <span className={`${styles.pill} ${styles.pillLoading}`}>
                    —
                  </span>
                </div>
                <span className={styles.indexValue}>
                  <span className={styles.valueInteger}>—</span>
                </span>
                <div className={styles.indexTag}>Index</div>
              </div>
            ))}
          </>
        )}
        {indices?.map(
          ({
            name,
            value,
            change,
            direction,
            valueNum,
            changePercentNum,
            tag,
          }) => {
            const Icon = direction === "up" ? TrendingUpIcon : TrendingDownIcon;
            const pillClass =
              direction === "up" ? styles.pillUp : styles.pillDown;
            return (
              <div key={name} className={styles.indexCard}>
                <div className={styles.indexHeader}>
                  <span className={styles.indexTitle}>
                    <span className={styles.liveDot} />
                    <span className={styles.indexName}>{name}</span>
                  </span>
                  <span className={`${styles.pill} ${pillClass}`}>
                    <Icon className={styles.iconSm} />
                    {formatPercent(changePercentNum, change)}
                  </span>
                </div>
                {renderValue(formatValue(valueNum, value))}
                <div className={styles.indexTag}>{getTag(tag, name)}</div>
              </div>
            );
          }
        )}
      </div>

      {/* cleanup timer on unmount */}
    </>
  );
}
