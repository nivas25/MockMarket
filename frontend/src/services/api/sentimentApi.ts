// API client for fetching market sentiment from backend
import http from "../../lib/http";

export type SentimentData = {
  overall: "bullish" | "bearish" | "neutral";
  score: number; // 0-100
  bullishPercent: number;
  bearishPercent: number;
  neutralPercent: number;
  totalStocks?: number;
  timestamp?: string;
};

interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}

export async function fetchMarketSentiment(): Promise<SentimentData> {
  const { data: result } = await http.get<ApiResponse<SentimentData>>(
    "/sentiment/market"
  );
  if (result.status === "success") {
    // Ensure timestamp is not null, convert to undefined if needed
    const data = result.data;
    return {
      ...data,
      timestamp: data.timestamp ?? undefined,
    };
  }
  throw new Error(result.message || "Failed to fetch market sentiment");
}
