"use client";

import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import {
  addStockToWatchlist,
  checkStockInWatchlist,
} from "@/services/watchlistApi";
import styles from "./AddToWatchlistButton.module.css";

interface AddToWatchlistButtonProps {
  stockId: number;
  stockSymbol: string;
}

export default function AddToWatchlistButton({
  stockId,
  stockSymbol,
}: AddToWatchlistButtonProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // Check watchlist status on mount (assume user is authenticated if on stock page)
  useEffect(() => {
    async function checkStatus() {
      console.log(
        "[AddToWatchlistButton] Checking watchlist status for stock_id:",
        stockId
      );

      // Check if stock is already in watchlist
      try {
        const inWatchlist = await checkStockInWatchlist(stockId);
        console.log("[AddToWatchlistButton] In watchlist:", inWatchlist);
        setIsInWatchlist(inWatchlist);
      } catch (error) {
        console.error("Error checking watchlist:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkStatus();
  }, [stockId]);

  const handleAddToWatchlist = async () => {
    setIsAdding(true);
    try {
      await addStockToWatchlist(stockId);
      setIsInWatchlist(true);

      // Show success message with better styling
      const successToast = document.createElement("div");
      successToast.className = `${styles["watchlist-toast"]} animate-fade-in`;
      successToast.innerHTML = `
        <svg viewBox="0 0 20 20">
          <path fill="currentColor" fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <span>${stockSymbol} added to watchlist</span>
      `;
      document.body.appendChild(successToast);

      setTimeout(() => {
        successToast.classList.add("animate-fade-out");
        setTimeout(() => successToast.remove(), 300);
      }, 2500);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      alert(
        error instanceof Error ? error.message : "Failed to add to watchlist"
      );
    } finally {
      setIsAdding(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <button
        disabled
        className={`${styles.watchlistButton} ${styles.loading}`}
      >
        <Star className={styles["star-icon"]} />
        <span>Loading...</span>
      </button>
    );
  }

  // Already in watchlist state
  if (isInWatchlist) {
    return (
      <button disabled className={`${styles.watchlistButton} ${styles.added}`}>
        <Star className={styles["star-icon"]} />
        <span>Added to Watchlist</span>
      </button>
    );
  }

  // Add to watchlist button
  return (
    <button
      onClick={handleAddToWatchlist}
      disabled={isAdding}
      className={`${styles.watchlistButton} ${
        isAdding ? styles.loading : styles.default
      }`}
    >
      <Star className={styles["star-icon"]} />
      <span>{isAdding ? "Adding..." : "Add to Watchlist"}</span>
    </button>
  );
}
