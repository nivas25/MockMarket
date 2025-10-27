// API client for fetching market news from backend
import http from "../../lib/http";
import axios from "axios";

export type NewsItem = {
  headline: string;
  source: string;
  summary?: string;
  timestamp?: string;
  imageUrl?: string;
  url?: string;
  category?: string;
};

interface ApiResponse<T> {
  status: string;
  data: T;
  count?: number;
  message?: string;
}

export async function fetchLatestNews(
  limit = 12,
  q?: string
): Promise<NewsItem[]> {
  const params: Record<string, string> = {};
  if (limit) params["limit"] = String(limit);
  if (q && q.trim()) params["q"] = q.trim();

  const attempt = async (timeoutMs: number) =>
    http.get<ApiResponse<NewsItem[]>>("/news/latest", {
      params,
      timeout: timeoutMs,
    });

  try {
    // Allow up to 15s for the first attempt since backend may aggregate RSS
    const { data: result } = await attempt(15000);
    if (result.status === "success") {
      return result.data || [];
    }
    throw new Error(result.message || "Failed to fetch market news");
  } catch (err) {
    // One quick retry if the first attempt timed out
    if (axios.isAxiosError(err) && err.code === "ECONNABORTED") {
      try {
        const { data: retryResult } = await attempt(8000);
        if (retryResult.status === "success") {
          return retryResult.data || [];
        }
      } catch {}
    }
    console.error("[NEWS API] Fetch error:", err);
    return [];
  }
}
