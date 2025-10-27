// API client for fetching market news from backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

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
  try {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (q && q.trim()) params.set("q", q.trim());

    const url = `${API_BASE_URL}/news/latest?${params.toString()}`;
    console.log("[NEWS API] Fetching from:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    console.log("[NEWS API] Response status:", response.status);

    if (!response.ok) {
      console.error("[NEWS API] HTTP error:", response.status);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<NewsItem[]> = await response.json();
    console.log("[NEWS API] Result:", result);

    if (result.status === "success") {
      console.log("[NEWS API] Success! Items:", result.data?.length || 0);
      return result.data || [];
    }
    throw new Error(result.message || "Failed to fetch market news");
  } catch (error) {
    console.error("[NEWS API] Fetch error:", error);
    return []; // Return empty array on error instead of throwing
  }
}
