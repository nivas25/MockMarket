import styles from "./StockDetail.module.css";
import StockHeader from "../components/StockHeader";
import StocksTopBar from "../components/StocksTopBar";
import StockChart from "../components/StockChart";
import { fetchStockDetail } from "@/services/api/stockDetailApi";

type StockPageProps = {
  params: Promise<{ symbol: string }>;
};

export async function generateMetadata({ params }: StockPageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol?.toUpperCase() || "RELIANCE";

  const title = `${symbol} Stock | MockMarket`;
  const description = `View ${symbol} live price, day range, and key market statistics.`;

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

  // Fetch real stock data from backend
  const stockData = await fetchStockDetail(symbol);

  if (!stockData) {
    return (
      <div className={styles.stockPage}>
        <StocksTopBar />
        <div className={styles.container}>
          <div className={styles.errorMessage}>
            <h2>Stock Not Found</h2>
            <p>Unable to load data for {symbol}. Please try another stock.</p>
          </div>
        </div>
      </div>
    );
  }

  // Map backend data to component format
  const stockFormatted = {
    symbol: stockData.symbol,
    companyName: stockData.companyName,
    currentPrice: stockData.currentPrice || 0,
    changePercent: stockData.changePercent || 0,
    exchange: stockData.exchange,
    previousClose: stockData.previousClose || 0,
    changeValue: stockData.changeValue || 0,
    dayHigh: stockData.dayHigh || 0,
    dayLow: stockData.dayLow || 0,
    dayOpen: stockData.dayOpen || 0,
  };

  return (
    <div className={styles.stockPage}>
      {/* Fixed glass TopBar */}
      <StocksTopBar />
      <div className={styles.container}>
        {/* Stock Header with price and basic info */}
        <StockHeader stock={stockFormatted} />

        {/* Main content grid */}
        <div className={styles.contentGrid}>
          {/* Left: Chart area */}
          <div className={styles.chartSection}>
            <div className={styles.chartToolbar}>
              <div className={styles.exchangePill}>{stockData.exchange}</div>
            </div>
            <StockChart symbol={symbol} />
          </div>
        </div>
      </div>
    </div>
  );
}
