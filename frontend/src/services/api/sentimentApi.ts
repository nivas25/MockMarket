// API client for fetching market sentiment from backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
  const response = await fetch(`${API_BASE_URL}/sentiment/market`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result: ApiResponse<SentimentData> = await response.json();
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
