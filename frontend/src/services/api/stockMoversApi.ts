// API client for fetching stock movers (gainers/losers) from backend
import http from "../../lib/http";

export interface StockMoverData {
  name: string;
  symbol: string;
  price: string;
  change: string;
  volume?: number; // Added for Most Active
  // Optional numeric fields for precise sorting/formatting
  priceNum?: number;
  changePercentNum?: number;
  changeValueNum?: number;
  asOf?: string;
}

interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  count?: number;
  message?: string;
}

/**
 * Fetch top gaining stocks from backend
 * @param limit - Number of gainers to fetch (default: 10)
 * @param exchange - Exchange filter (default: 'NSE')
 */
export async function fetchTopGainers(
  limit: number = 10,
  exchange: string = "NSE",
  intraday: boolean = false
): Promise<StockMoverData[]> {
  try {
    const { data: result } = await http.get<ApiResponse<StockMoverData[]>>(
      "/stocks/top-gainers",
      { params: { limit, exchange, intraday } }
    );

    if (result.status === "success" && result.data) {
      return result.data;
    }

    console.error("Top gainers API error:", result.message);
    return [];
  } catch (error) {
    console.error("Error fetching top gainers:", error);
    return [];
  }
}

/**
 * Fetch top losing stocks from backend
 * @param limit - Number of losers to fetch (default: 10)
 * @param exchange - Exchange filter (default: 'NSE')
 */
export async function fetchTopLosers(
  limit: number = 10,
  exchange: string = "NSE",
  intraday: boolean = false
): Promise<StockMoverData[]> {
  try {
    const { data: result } = await http.get<ApiResponse<StockMoverData[]>>(
      "/stocks/top-losers",
      { params: { limit, exchange, intraday } }
    );

    if (result.status === "success" && result.data) {
      return result.data;
    }

    console.error("Top losers API error:", result.message);
    return [];
  } catch (error) {
    console.error("Error fetching top losers:", error);
    return [];
  }
}

/**
 * Fetch most active stocks by volume from backend
 * @param limit - Number of active stocks to fetch (default: 10)
 * @param exchange - Exchange filter (default: 'NSE')
 */
export async function fetchMostActive(
  limit: number = 10,
  exchange: string = "NSE"
): Promise<StockMoverData[]> {
  try {
    const { data: result } = await http.get<ApiResponse<StockMoverData[]>>(
      "/stocks/most-active",
      { params: { limit, exchange } }
    );

    if (result.status === "success" && result.data) {
      return result.data;
    }

    console.error("Most active API error:", result.message);
    return [];
  } catch (error) {
    console.error("Error fetching most active:", error);
    return [];
  }
}
