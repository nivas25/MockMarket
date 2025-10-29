// API client for searching stocks
import http from "../../lib/http";

export interface StockSearchResult {
  symbol: string;
  companyName: string;
  exchange: string;
  currentPrice: number | null;
  changePercent: number | null;
}

interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  count?: number;
  message?: string;
}

/**
 * Search stocks by symbol or company name
 * @param query - Search query (symbol or company name)
 * @param limit - Maximum number of results (default: 10, max: 50)
 */
export async function searchStocks(
  query: string,
  limit: number = 10
): Promise<StockSearchResult[]> {
  try {
    if (!query.trim()) {
      return [];
    }

    console.log(`[stockSearchApi] Searching for: "${query}"`);

    const { data: result } = await http.get<ApiResponse<StockSearchResult[]>>(
      `/stocks/search`,
      {
        params: {
          q: query.trim(),
          limit: Math.min(limit, 50),
        },
      }
    );

    if (result.status === "success" && result.data) {
      console.log(`[stockSearchApi] Found ${result.count} results`);
      return result.data;
    }

    console.warn("[stockSearchApi] No results or error:", result.message);
    return [];
  } catch (error: unknown) {
    const err = error as {
      message?: string;
      response?: { data?: unknown; status?: number };
    };
    console.error("[stockSearchApi] Error searching stocks:", {
      message: err?.message,
      status: err?.response?.status,
    });
    return [];
  }
}
