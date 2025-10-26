import styles from "./StockDetail.module.css";

export default function LoadingStockPage() {
  return (
    <div className={styles.stockPage}>
      <div className={styles.container}>
        {/* Header skeleton */}
        <div
          className={`${styles.skeleton} ${styles.shimmer} ${styles.skHeader}`}
        />

        {/* Main content grid */}
        <div className={styles.contentGrid}>
          <div
            className={`${styles.skeleton} ${styles.shimmer} ${styles.skChart}`}
          />
          <div
            className={`${styles.skeleton} ${styles.shimmer} ${styles.skRightPanel}`}
          />
        </div>

        {/* Stats grid skeleton */}
        <div className={styles.skStatGrid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className={`${styles.skeleton} ${styles.shimmer} ${styles.skStatCard}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
