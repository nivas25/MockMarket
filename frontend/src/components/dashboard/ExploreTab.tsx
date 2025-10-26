import styles from "./DashboardWidgets.module.css";
import { TopGainers } from "./TopGainers";
import { TopLosers } from "./TopLosers";
import { MarketNews } from "./MarketNews";
import { MostActive } from "./MostActive";
import { MarketSentiment } from "./MarketSentiment";
import { SectorPerformance } from "./SectorPerformance";
import { TrendingUpIcon, TrendingDownIcon } from "./Icons";
import type {
  StockMover,
  ActiveStock,
  NewsItem,
  SentimentData,
} from "../../app/dashboard/types";

type ExploreTabProps = {
  topGainers: StockMover[];
  topLosers: StockMover[];
  mostActive: ActiveStock[];
  marketNews: NewsItem[];
};

// TEMPORARY MOCK DATA FOR TESTING - REMOVE AFTER REAL DATA IS WIRED
const MOCK_TOP_GAINERS: StockMover[] = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd.",
    price: "2,847.60",
    change: "+4.82%",
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services",
    price: "3,912.45",
    change: "+3.67%",
  },
  {
    symbol: "INFY",
    name: "Infosys Limited",
    price: "1,582.30",
    change: "+3.24%",
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Limited",
    price: "1,645.90",
    change: "+2.91%",
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Limited",
    price: "1,089.75",
    change: "+2.58%",
  },
  {
    symbol: "BHARTIARTL",
    name: "Bharti Airtel Limited",
    price: "1,234.20",
    change: "+2.15%",
  },
  { symbol: "ITC", name: "ITC Limited", price: "478.50", change: "+1.89%" },
];

const MOCK_MARKET_NEWS: NewsItem[] = [
  {
    headline: "Indian Markets Hit All-Time High as FIIs Return",
    source: "Economic Times",
    summary:
      "Foreign institutional investors pumped in ₹12,000 crore in the last week, driving benchmark indices to record levels.",
    timestamp: "2 hours ago",
    category: "Markets",
    imageUrl:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop",
    url: "https://economictimes.com",
  },
  {
    headline: "RBI Keeps Repo Rate Unchanged at 6.5%, Maintains Neutral Stance",
    source: "Moneycontrol",
    summary:
      "The central bank decided to keep the policy rate steady while monitoring inflation trends and global developments.",
    timestamp: "4 hours ago",
    category: "Policy",
    imageUrl:
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=250&fit=crop",
    url: "https://moneycontrol.com",
  },
  {
    headline: "Tech Stocks Rally on Strong Q3 Earnings from IT Giants",
    source: "Business Standard",
    summary:
      "TCS and Infosys reported better-than-expected quarterly results, boosting investor confidence in the technology sector.",
    timestamp: "6 hours ago",
    category: "Earnings",
    imageUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
    url: "https://business-standard.com",
  },
  {
    headline: "Crude Oil Prices Surge 5% on Middle East Tensions",
    source: "Bloomberg",
    summary:
      "Global oil prices jumped sharply as geopolitical uncertainties in the Middle East raised supply concerns.",
    timestamp: "8 hours ago",
    category: "Commodities",
    imageUrl:
      "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=400&h=250&fit=crop",
    url: "https://bloomberg.com",
  },
  {
    headline: "Rupee Strengthens to 82.5 Against Dollar on Strong Inflows",
    source: "Reuters",
    summary:
      "The Indian currency gained 40 paise as sustained foreign fund inflows and positive domestic equities supported the local unit.",
    timestamp: "10 hours ago",
    category: "Currency",
    imageUrl:
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=250&fit=crop",
    url: "https://reuters.com",
  },
];
// END TEMPORARY MOCK DATA

// TEMPORARY MOCK SENTIMENT DATA - REMOVE AFTER REAL DATA IS WIRED
const MOCK_SENTIMENT: SentimentData = {
  overall: "bullish",
  score: 68,
  bullishPercent: 52,
  bearishPercent: 23,
  neutralPercent: 25,
  timestamp: "2 mins ago",
};
// END TEMPORARY MOCK DATA

export function ExploreTab({
  topGainers,
  topLosers,
  mostActive,
  marketNews,
}: ExploreTabProps) {
  // TEMPORARY: Use mock data if empty - REMOVE THIS AFTER REAL DATA IS WIRED
  const displayGainers = topGainers.length > 0 ? topGainers : MOCK_TOP_GAINERS;
  const displayNews = marketNews.length > 0 ? marketNews : MOCK_MARKET_NEWS;
  return (
    <>
      {/* Top Gainers Section - Bookmark Design */}
      <div className={styles.bookmarkSection}>
        <div className={`${styles.widget} ${styles.topGainersWidget ?? ""}`}>
          <div className={styles.bookmarkHeader}>
            <h2 className={styles.bookmarkTitle}>
              <span className={styles.widgetIcon}>
                <TrendingUpIcon />
              </span>
              Top Gainers
            </h2>
            <a href="#" className={styles.viewAllLink}>
              View All →
            </a>
          </div>
          <div className={styles.dataList}>
            <TopGainers items={displayGainers} limit={5} />
          </div>
        </div>
      </div>

      {/* Top Losers Section - Bookmark Design */}
      <div className={styles.bookmarkSection}>
        <div className={`${styles.widget} ${styles.topLosersWidget ?? ""}`}>
          <div className={styles.bookmarkHeader}>
            <h2 className={styles.bookmarkTitle}>
              <span className={styles.widgetIcon}>
                <TrendingDownIcon />
              </span>
              Top Losers
            </h2>
            <a href="#" className={styles.viewAllLink}>
              View All →
            </a>
          </div>
          <div className={styles.dataList}>
            <TopLosers items={topLosers} limit={5} />
          </div>
        </div>
      </div>

      {/* Market News Section - Bookmark Design */}
      <div className={styles.bookmarkSection}>
        <div className={`${styles.widget} ${styles.marketNewsWidget ?? ""}`}>
          <div className={styles.bookmarkHeader}>
            <h2 className={styles.bookmarkTitle}>Market News</h2>
            <a href="#" className={styles.viewAllLink}>
              View All →
            </a>
          </div>
          <div className={styles.dataList}>
            <MarketNews items={displayNews} limit={5} />
          </div>
        </div>
      </div>

      {/* Most Active Section - Bookmark Design */}
      <div className={styles.bookmarkSection}>
        <div className={`${styles.widget} ${styles.mostActiveWidget ?? ""}`}>
          <div className={styles.bookmarkHeader}>
            <h2 className={styles.bookmarkTitle}>Most Active</h2>
            <a href="#" className={styles.viewAllLink}>
              View All →
            </a>
          </div>
          <div className={styles.dataList}>
            <MostActive items={mostActive} limit={5} />
          </div>
        </div>
      </div>

      {/* Market Sentiment Section - Bookmark Design */}
      <div className={styles.bookmarkSection}>
        <div className={`${styles.widget} ${styles.sentimentWidget ?? ""}`}>
          <div className={styles.bookmarkHeader}>
            <h2 className={styles.bookmarkTitle}>Market Sentiment</h2>
          </div>
          <div className={styles.dataList}>
            <MarketSentiment data={MOCK_SENTIMENT} />
          </div>
        </div>
      </div>

      {/* Sector Performance - Bookmark Design */}
      <div className={styles.bookmarkSection}>
        <div className={`${styles.widget} ${styles.sectorWidget ?? ""}`}>
          <div className={styles.bookmarkHeader}>
            <h2 className={styles.bookmarkTitle}>Sector Performance</h2>
          </div>
          <div className={styles.dataList}>
            <SectorPerformance
              items={[
                { name: "IT", changePercent: 3.2 },
                { name: "Banking", changePercent: 2.1 },
                { name: "Pharma", changePercent: -1.5 },
                { name: "Realty", changePercent: -2.8 },
              ]}
            />
          </div>
        </div>
      </div>
    </>
  );
}
