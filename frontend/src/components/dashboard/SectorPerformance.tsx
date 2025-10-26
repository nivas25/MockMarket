import React from "react";
import styles from "./SectorPerformance.module.css";

export interface SectorItem {
  name: string;
  changePercent: number; // negative for down
}

interface SectorPerformanceProps {
  items: SectorItem[];
  limit?: number;
  showTrend?: boolean; // optional tiny arrow
}

export const SectorPerformance: React.FC<SectorPerformanceProps> = ({
  items,
  limit = 6,
  showTrend = true,
}) => {
  const trimmed = items.slice(0, limit);

  return (
    <div className={styles.list}>
      {trimmed.map((s) => {
        const up = s.changePercent >= 0;
        const cls = up ? styles.bullish : styles.bearish;
        const absPct = Math.abs(s.changePercent).toFixed(1);
        const title = `${s.name} · ${up ? "+" : "-"}${absPct}%`;

        return (
          <div key={s.name} className={styles.row} title={title}>
            <div className={styles.name}>{s.name}</div>

            <div className={`${styles.chip} ${cls}`}>
              <span className={styles.dot} aria-hidden="true" />
              {showTrend && (
                <span
                  className={`${styles.trend} ${
                    up ? styles.trendUp : styles.trendDown
                  }`}
                  aria-hidden="true"
                />
              )}
              <span className={styles.value}>
                {up ? "+" : "-"}
                {absPct}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
