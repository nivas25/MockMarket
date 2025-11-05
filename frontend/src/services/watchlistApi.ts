/**
 * Watchlist API Service
 * Handles adding/removing/checking stocks in user watchlist
 */

import { jwtDecode } from "jwt-decode";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

/**
 * Get user_id from JWT token (decode on frontend like OrderPanel does)
 */
function getUserIdFromToken(): number | null {
  if (typeof window === "undefined") {
    console.log("[watchlistApi] Running on server side, no user_id available");
    return null;
  }

  // Use 'authToken' to match the key used in OrderPanel
  const token = localStorage.getItem("authToken");

  if (!token) {
    console.log("[watchlistApi] No authToken found in localStorage");
    return null;
  }

  try {
    const decoded = jwtDecode(token) as { sub: { user_id: number } };
    const userId = decoded.sub.user_id;
    console.log("[watchlistApi] ✓ Decoded user_id:", userId);
    return userId;
  } catch (error) {
    console.error("[watchlistApi] Error decoding JWT:", error);
    return null;
  }
}

/**
 * Add a stock to user's watchlist
 */
export async function addStockToWatchlist(stockId: number): Promise<{
  success: boolean;
  message: string;
}> {
  console.log("[addStockToWatchlist] Starting for stock_id:", stockId);

  const userId = getUserIdFromToken();
  if (!userId) {
    console.error("[addStockToWatchlist] No user_id found!");
    throw new Error("User not authenticated");
  }

  console.log(
    "[addStockToWatchlist] user_id found:",
    userId,
    "making API call..."
  );

  const response = await fetch(`${API_BASE_URL}/watchlist/add-stock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stock_id: stockId, user_id: userId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to add stock to watchlist");
  }

  return data;
}

/**
 * Check if a stock is in user's watchlist
 */
export async function checkStockInWatchlist(stockId: number): Promise<boolean> {
  const userId = getUserIdFromToken();
  if (!userId) {
    return false; // Not authenticated = not in watchlist
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/watchlist/check-stock?stock_id=${stockId}&user_id=${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    return data.in_watchlist || false;
  } catch (error) {
    console.error("Error checking watchlist status:", error);
    return false;
  }
}

/**
 * Remove a stock from user's watchlist
 * (This will be used by your friend in the watchlist tab)
 */
export async function removeStockFromWatchlist(stockId: number): Promise<{
  success: boolean;
  message: string;
}> {
  const userId = getUserIdFromToken();
  if (!userId) {
    throw new Error("User not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/watchlist/remove-stock`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stock_id: stockId, user_id: userId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to remove stock from watchlist");
  }

  return data;
}
