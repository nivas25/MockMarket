// API client for fetching individual stock details
import http from "../../lib/http";

export interface StockDetailData {
  stock_id: number;
  symbol: string;
  companyName: string;
  exchange: string;
  sector?: string;
  currentPrice: number | null;
  previousClose: number | null;
  dayOpen: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  changePercent: number | null;
  changeValue: number | null;
  asOf: string | null;
  priceSource?: string;
  timestamp?: string;
}

interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

/**
 * Fetch detailed stock information by symbol
 * @param symbol - Stock symbol (e.g., 'RELIANCE')
 */
export async function fetchStockDetail(
  symbol: string,
  opts: { forceLive?: boolean } = {}
): Promise<StockDetailData | null> {
  try {
    console.log(`[stockDetailApi] Fetching stock: ${symbol}`);
    const qs = opts.forceLive ? "?forceLive=1" : "";
    const { data: result } = await http.get<ApiResponse<StockDetailData>>(
      `/stocks/detail/${symbol.toUpperCase()}${qs}`
    );

    console.log(`[stockDetailApi] Response:`, result);

    if (result.status === "success" && result.data) {
      return result.data;
    }

    console.error("[stockDetailApi] Stock detail API error:", result.message);
    return null;
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      response?: { data?: unknown; status?: number };
    };
    console.error("[stockDetailApi] Error fetching stock detail:", {
      message: err?.message,
      response: err?.response?.data,
      status: err?.response?.status,
    });
    return null;
  }
}
