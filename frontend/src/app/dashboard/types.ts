export type StockMover = {
  name: string;
  symbol: string;
  price: string;
  change: string;
  volume?: number; // For most active stocks
};

export type ActiveStock = {
  name: string;
  symbol: string;
  price: string;
  volume: string;
  change: string;
};

export type NewsItem = {
  headline: string;
  source: string;
  summary?: string;
  timestamp?: string;
  imageUrl?: string;
  url?: string;
  category?: string;
};

export type SentimentData = {
  overall: "bullish" | "bearish" | "neutral";
  score: number; // 0-100
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
  timestamp?: string;
};

export type Holding = {
  name: string;
  qty: number;
  avg: string;
  current: string;
  pnl: string;
  // Optional fields for richer holdings UI
  prevClose?: string; // previous close per share for 1D returns
};

export type OrderStatus = "Completed" | "Pending" | "Cancelled";

export type Order = {
  order_id: number;
  name: string;
  type: "BUY" | "SELL";
  qty: number;
  price: string;
  status: OrderStatus;
};

export type DashboardTab = "Explore" | "Holdings" | "Orders" | "Watchlist";

export interface DashboardPageProps {
  topGainers?: StockMover[];
  topLosers?: StockMover[];
  mostActive?: ActiveStock[];
  marketNews?: NewsItem[];
  holdings?: Holding[];
  orders?: Order[];
  watchlist?: StockMover[];
}
