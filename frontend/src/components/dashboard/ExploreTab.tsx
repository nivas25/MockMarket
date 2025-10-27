import styles from "./DashboardWidgets.module.css";
import { TopGainers } from "./TopGainers";
import { TopLosers } from "./TopLosers";
import { MarketNews } from "./MarketNews";
import { MostActive } from "./MostActive";
import { MarketSentiment } from "./MarketSentiment";
import { TrendingUpIcon, TrendingDownIcon } from "./Icons";
import type {
  StockMover,
  ActiveStock,
  NewsItem,
} from "../../app/dashboard/types";
import type { SentimentData } from "../../services/api/sentimentApi";

type ExploreTabProps = {
  topGainers: StockMover[];
  topLosers: StockMover[];
  mostActive: ActiveStock[];
  marketNews: NewsItem[];
  sentiment?: SentimentData | null;
};

export function ExploreTab({
  topGainers,
  topLosers,
  mostActive,
  marketNews,
  sentiment,
}: ExploreTabProps) {
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
          </div>
          <div className={styles.dataList}>
            <TopGainers items={topGainers} limit={5} />
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
          </div>
          <div className={styles.dataList}>
            <MarketNews items={marketNews} limit={5} />
          </div>
        </div>
      </div>

      {/* Most Active Section - Bookmark Design */}
      <div className={styles.bookmarkSection}>
        <div className={`${styles.widget} ${styles.mostActiveWidget ?? ""}`}>
          <div className={styles.bookmarkHeader}>
            <h2 className={styles.bookmarkTitle}>Most Active</h2>
          </div>
          <div className={styles.dataList}>
            <MostActive items={mostActive} limit={5} />
          </div>
        </div>
      </div>

      {/* Market Sentiment Section - Bookmark Design */}
      {sentiment && (
        <div className={styles.bookmarkSection}>
          <div className={`${styles.widget} ${styles.sentimentWidget ?? ""}`}>
            <div className={styles.bookmarkHeader}>
              <h2 className={styles.bookmarkTitle}>Market Sentiment</h2>
            </div>
            <div className={styles.dataList}>
              <MarketSentiment data={sentiment} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
