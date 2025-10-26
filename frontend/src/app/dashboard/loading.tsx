"use client";

import styles from "./Dashboard.module.css";

export default function LoadingDashboard() {
  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainContent}>
        {/* Indices strip */}
        <div
          className={`${styles.skeleton} ${styles.shimmer} ${styles.skTopStrip}`}
        />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`${styles.skeleton} ${styles.shimmer}`}
              style={{ height: 38, width: 100, borderRadius: 9999 }}
            />
          ))}
        </div>

        {/* Two column placeholders */}
        <div className={styles.skTwoCol}>
          <div
            className={`${styles.skeleton} ${styles.shimmer} ${styles.skCardTall}`}
          />
          <div style={{ display: "grid", gap: 12 }}>
            <div
              className={`${styles.skeleton} ${styles.shimmer} ${styles.skCard}`}
            />
            <div
              className={`${styles.skeleton} ${styles.shimmer} ${styles.skCard}`}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
