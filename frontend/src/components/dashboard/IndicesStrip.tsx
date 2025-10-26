import styles from "./IndicesStrip.module.css";
import { TrendingDownIcon, TrendingUpIcon } from "./Icons";

type MarketIndex = {
  name: string;
  value: string;
  change: string;
  direction: "up" | "down";
};

const indices: MarketIndex[] = [
  { name: "NIFTY 50", value: "18,542.10", change: "+0.80%", direction: "up" },
  { name: "SENSEX", value: "62,180.50", change: "+0.91%", direction: "up" },
  {
    name: "BANKNIFTY",
    value: "43,989.15",
    change: "-0.12%",
    direction: "down",
  },
  { name: "INDIA VIX", value: "12.30", change: "+1.50%", direction: "up" },
];

export function IndicesStrip() {
  const getTag = (name: string): string => {
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
  return (
    <>
      <div className={styles.indicesHeading}>Market Indices</div>
      <div className={styles.indicesStrip}>
        {indices.map(({ name, value, change, direction }) => {
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
                  {change}
                </span>
              </div>
              {renderValue(value)}
              <div className={styles.indexTag}>{getTag(name)}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
