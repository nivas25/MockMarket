"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/contexts/ThemeProvider";
import styles from "./Dashboard.module.css";
import type {
  DashboardPageProps,
  DashboardTab,
  Order,
  StockMover,
} from "./types";
import {
  TopBar,
  IndicesStrip,
  MainNavTabs,
  ExploreTab,
  HoldingsTab,
  OrdersTab,
  WatchlistTab,
} from "../../components/dashboard";
import Footer from "../../components/landing/Footer";
import { useMovers } from "../../hooks/useMovers";
import { useNews } from "../../hooks/useNews";
import { useSentiment } from "../../hooks/useSentiment";

export default function DashboardClient({
  holdings = [],
  orders = [],
  watchlist = [],
}: DashboardPageProps = {}) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<DashboardTab>("Explore");
  const [isScrolled, setIsScrolled] = useState(false);

  // User balance - TODO: fetch from backend API
  const userBalance = 100000; // Default starting balance

  // Real-time stock movers data
  const { gainers, losers, mostActive: activeList } = useMovers(10, "NSE");
  const { news } = useNews(12);
  const { sentiment: liveSentiment } = useSentiment();

  // SWR handles polling and caching for movers, news, and sentiment

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => setTheme(theme === "light" ? "dark" : "light");

  const handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("authToken");
      sessionStorage.removeItem("authToken");
    } catch {}
    window.location.href = "/";
  };

  return (
    <div className={styles.pageContainer}>
      <TopBar
        theme={theme}
        isScrolled={isScrolled}
        onToggleTheme={toggleTheme}
        onReset={handleReset}
        onLogout={handleLogout}
      />

      <main className={styles.mainContent}>
        <IndicesStrip />

        <MainNavTabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className={styles.contentArea}>
          {activeTab === "Explore" && (
            <ExploreTab
              topGainers={gainers}
              topLosers={losers}
              mostActive={activeList}
              marketNews={news}
              sentiment={liveSentiment}
            />
          )}

          {activeTab === "Holdings" && (
            <HoldingsTab holdings={holdings} balance={userBalance} />
          )}

          {activeTab === "Orders" && <OrdersTab orders={orders} />}

          {activeTab === "Watchlist" && <WatchlistTab watchlist={watchlist} />}
        </div>
      </main>

      <Footer />
    </div>
  );
}
