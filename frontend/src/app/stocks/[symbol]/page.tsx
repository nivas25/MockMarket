import styles from "./StockDetail.module.css";
import StockHeader from "../components/StockHeader";
import OrderPanel from "../components/OrderPanel";
import StockStats from "../components/StockStats";
import StocksTopBar from "../components/StocksTopBar";
import { getMockStockDetail } from "@/data/mockStocks";

type StockPageProps = {
  params: Promise<{ symbol: string }>;
};

// Using shared mock data util for development

export async function generateMetadata({ params }: StockPageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol?.toUpperCase() || "RELIANCE";

  const title = `${symbol} Stock | MockMarket`;
  const description = `View ${symbol} price, day range, volume, and 52W stats.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `/stocks/${symbol}`,
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: `${symbol} – MockMarket`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function StockPage({ params }: StockPageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol?.toUpperCase() || "RELIANCE";
  const stockData = getMockStockDetail(symbol);

  return (
    <div className={styles.stockPage}>
      {/* Fixed glass TopBar */}
      <StocksTopBar />
      <div className={styles.container}>
        {/* Stock Header with price and basic info */}
        <StockHeader stock={stockData} />

        {/* Main content grid */}
        <div className={styles.contentGrid}>
          {/* Left: Chart area (placeholder for now) */}
          <div className={styles.chartSection}>
            <div className={styles.chartToolbar}>
              <div className={styles.exchangePill}>NSE</div>
              <div className={styles.timeframeGroup}>
                {(["1D", "1W", "1M", "3M", "6M", "1Y"] as const).map((tf) => (
                  <button
                    key={tf}
                    className={styles.timeframeBtn}
                    type="button"
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.chartPlaceholder}>
              <div className={styles.placeholderContent}>
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M3 3v18h18" />
                  <path d="M18 9l-5 5-3-3-4 4" />
                </svg>
                <p>Price Chart Coming Soon</p>
                <span>Real-time candlestick chart will appear here</span>
              </div>
            </div>
          </div>

          {/* Right: Order Panel */}
          <OrderPanel currentPrice={stockData.currentPrice} />
        </div>

        {/* Stock Statistics */}
        <StockStats stock={stockData} />
      </div>
    </div>
  );
}
