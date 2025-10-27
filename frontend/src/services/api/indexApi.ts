// API client for fetching index data from backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface IndexData {
  name: string;
  value: string;
  change: string;
  direction: "up" | "down";
  tag?: string;
  lastUpdated?: string;
  // Numeric fields for precise formatting (optional, depends on backend)
  valueNum?: number;
  changePercentNum?: number;
  changeValueNum?: number;
}

export interface IndexDetailData extends IndexData {
  open?: string;
  high?: string;
  low?: string;
  prevClose?: string;
  changeValue?: string;
}

export interface GroupedIndicesData {
  [tag: string]: IndexDetailData[];
}

interface ApiResponse<T> {
  status: string;
  data: T;
  count?: number;
  totalIndices?: number;
  message?: string;
}

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

/**
 * Fetch top 4 indices for dashboard strip
 */
export async function fetchTop4Indices(): Promise<IndexData[]> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/indices/top4`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<IndexData[]> = await response.json();

    if (result.status === "success") {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to fetch indices");
    }
  } catch (error) {
    console.error("Error fetching top 4 indices:", error);
    throw error;
  }
}

/**
 * Fetch all indices for 'View All' page
 */
export async function fetchAllIndices(): Promise<GroupedIndicesData> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/indices/all`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<GroupedIndicesData> = await response.json();

    if (result.status === "success") {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to fetch all indices");
    }
  } catch (error) {
    console.error("Error fetching all indices:", error);
    throw error;
  }
}

/**
 * Fetch specific index by name
 */
export async function fetchIndexByName(
  indexName: string
): Promise<IndexDetailData> {
  try {
    const token = getAuthToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/indices/${encodeURIComponent(indexName)}`,
      {
        method: "GET",
        headers,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse<IndexDetailData> = await response.json();

    if (result.status === "success") {
      return result.data;
    } else {
      throw new Error(result.message || "Failed to fetch index");
    }
  } catch (error) {
    console.error(`Error fetching index ${indexName}:`, error);
    throw error;
  }
}
