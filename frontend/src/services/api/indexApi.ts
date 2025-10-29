// API client for fetching index data from backend
import http from "../../lib/http";

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
 * Fetch top 4 indices for dashboard strip
 */
/**
 * Fetch all indices for 'View All' page
 */
export async function fetchAllIndices(): Promise<GroupedIndicesData> {
  try {
    const { data: result } = await http.get<ApiResponse<GroupedIndicesData>>(
      `/indices/all`
    );

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
    const { data: result } = await http.get<ApiResponse<IndexDetailData>>(
      `/indices/${encodeURIComponent(indexName)}`
    );

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
