"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../../components/contexts/ThemeProvider";
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

export default function DashboardClient({
  topGainers = [],
  topLosers = [],
  mostActive = [],
  marketNews = [],
  holdings = [],
  orders = [],
  watchlist = [],
}: DashboardPageProps = {}) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<DashboardTab>("Explore");
  const [isScrolled, setIsScrolled] = useState(false);

  // Mock data for testing
  const mockHoldings = [
    {
      name: "Ashok Leyland",
      qty: 1,
      avg: "131.04",
      current: "136.35",
      pnl: "+5.31",
      prevClose: "137.85", // For 1D returns
    },
    {
      name: "Infibeam Avenues",
      qty: 1,
      avg: "14.93",
      current: "18.92",
      pnl: "+3.99",
      prevClose: "19.12",
    },
    {
      name: "Reliance Industries",
      qty: 5,
      avg: "2450.00",
      current: "2523.50",
      pnl: "+367.50",
      prevClose: "2510.25",
    },
    {
      name: "TCS",
      qty: 2,
      avg: "3550.00",
      current: "3489.75",
      pnl: "-120.50",
      prevClose: "3505.00",
    },
    {
      name: "HDFC Bank",
      qty: 3,
      avg: "1625.50",
      current: "1678.25",
      pnl: "+158.25",
      prevClose: "1670.00",
    },
  ];

  const mockBalance = 75430.5;
  const mockOrders: Order[] = [
    {
      name: "INFY",
      type: "BUY",
      qty: 12,
      price: "1555.25",
      status: "Completed",
    },
    {
      name: "RELIANCE",
      type: "SELL",
      qty: 4,
      price: "2523.50",
      status: "Completed",
    },
    { name: "TCS", type: "BUY", qty: 5, price: "3490.00", status: "Pending" },
    {
      name: "HDFCBANK",
      type: "SELL",
      qty: 3,
      price: "1678.25",
      status: "Cancelled",
    },
    {
      name: "ASHOKLEY",
      type: "BUY",
      qty: 25,
      price: "136.35",
      status: "Pending",
    },
    {
      name: "IBULHSGFIN",
      type: "SELL",
      qty: 50,
      price: "123.10",
      status: "Completed",
    },
  ];

  const mockWatchlist: StockMover[] = [
    { name: "Infosys", symbol: "INFY", price: "1555.25", change: "+0.8%" },
    {
      name: "Reliance Industries",
      symbol: "RELIANCE",
      price: "2523.50",
      change: "+0.3%",
    },
    {
      name: "Tata Consultancy Services",
      symbol: "TCS",
      price: "3490.00",
      change: "-0.6%",
    },
    {
      name: "HDFC Bank",
      symbol: "HDFCBANK",
      price: "1678.25",
      change: "+1.2%",
    },
    {
      name: "Ashok Leyland",
      symbol: "ASHOKLEY",
      price: "136.35",
      change: "-0.4%",
    },
  ];

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
              topGainers={topGainers}
              topLosers={topLosers}
              mostActive={mostActive}
              marketNews={marketNews}
            />
          )}

          {activeTab === "Holdings" && (
            <HoldingsTab
              holdings={mockHoldings.length > 0 ? mockHoldings : holdings}
              balance={mockBalance}
            />
          )}

          {activeTab === "Orders" && (
            <OrdersTab orders={mockOrders.length > 0 ? mockOrders : orders} />
          )}

          {activeTab === "Watchlist" && (
            <WatchlistTab
              watchlist={mockWatchlist.length > 0 ? mockWatchlist : watchlist}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
