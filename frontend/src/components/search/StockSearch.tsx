"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { searchStocks } from "@/services/api/stockSearchApi";
import styles from "./StockSearch.module.css";

type StockResult = {
  symbol: string;
  companyName: string;
  currentPrice: number | null;
  changePercent: number | null;
  exchange: string;
};

type StockSearchProps = {
  placeholder?: string;
  className?: string;
};

export default function StockSearch({
  placeholder = "Search stocks, orders, watchlist…",
  className = "",
}: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const resultItemsRef = useRef<Map<number, HTMLDivElement>>(new Map());
  const router = useRouter();

  // Detect mobile viewport to adjust placeholder and sizing
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 480px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  // Instant search with minimal debounce; supports 1+ characters
  useEffect(() => {
    // Show loading immediately for better UX
    if (query.trim()) {
      setIsLoading(true);
    }

    const controller = new AbortController();
    const delay = query.trim().length <= 1 ? 200 : 120;
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        setIsLoading(false);
        return;
      }

      try {
        // Call real API
        const limit = q.length <= 1 ? 5 : 10; // lighter query for 1-char search
        const stockResults = await searchStocks(q, limit, controller.signal);
        setResults(stockResults);
        setIsOpen(stockResults.length > 0);
        setSelectedIndex(-1);
      } catch (error: unknown) {
        // Ignore cancellation errors triggered by AbortController
        if (typeof error === "object" && error !== null) {
          const e = error as { code?: string; name?: string; message?: string };
          if (
            e.code === "ERR_CANCELED" ||
            e.name === "CanceledError" ||
            e.message === "canceled"
          ) {
            return;
          }
        }
        console.error("Search error:", error);
        setResults([]);
        setIsOpen(false);
      } finally {
        setIsLoading(false);
      }
    }, delay); // Adaptive debounce for 1-char vs 2+ chars

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  // Calculate dropdown position
  const computePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();

      // On mobile, use full width with some padding
      if (window.innerWidth <= 480) {
        setCoords({
          top: rect.bottom + 8,
          left: 16, // 16px padding from left
          width: window.innerWidth - 32, // 32px total padding (16px each side)
        });
      } else {
        setCoords({
          top: rect.bottom + 8,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  }, []);

  // Update position on mount and scroll/resize
  useEffect(() => {
    computePosition();
    window.addEventListener("scroll", computePosition, true);
    window.addEventListener("resize", computePosition);

    return () => {
      window.removeEventListener("scroll", computePosition, true);
      window.removeEventListener("resize", computePosition);
    };
  }, [computePosition]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        // Check if click is inside dropdown (which is portaled to body)
        const dropdown = document.querySelector(`.${styles.dropdown}`);
        if (dropdown && dropdown.contains(e.target as Node)) {
          return; // Don't close if clicking inside dropdown
        }
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-scroll selected item into view when using keyboard navigation
  useEffect(() => {
    if (selectedIndex >= 0) {
      const selectedElement = resultItemsRef.current.get(selectedIndex);
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "nearest",
        });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        } else if (results.length > 0) {
          // Fallback: open the first result when nothing is selected
          handleSelect(results[0]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle stock selection
  const handleSelect = useCallback(
    (stock: StockResult) => {
      setQuery("");
      setIsOpen(false);
      setSelectedIndex(-1);
      inputRef.current?.blur();
      router.push(`/stocks/${stock.symbol}`);
    },
    [router]
  );

  // Ctrl+K to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const dropdown =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className={styles.dropdown}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            onMouseDown={(e) => e.stopPropagation()} // Prevent click from bubbling
            onTouchStart={(e) => e.stopPropagation()} // Prevent touch from bubbling
          >
            {isLoading && results.length === 0 ? (
              <div className={styles.loadingMessage}>
                <span className={styles.loadingSpinnerLarge}>⏳</span>
                <span>Searching...</span>
              </div>
            ) : (
              results.map((stock, idx) => (
                <div
                  key={stock.symbol}
                  ref={(el) => {
                    if (el) {
                      resultItemsRef.current.set(idx, el);
                    } else {
                      resultItemsRef.current.delete(idx);
                    }
                  }}
                  className={`${styles.resultItem} ${
                    idx === selectedIndex ? styles.selected : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent input blur
                    handleSelect(stock);
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault(); // Prevent double-tap zoom on mobile
                    handleSelect(stock);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={styles.resultMain}>
                    <span className={styles.symbol}>{stock.symbol}</span>
                    <span className={styles.companyName}>
                      {stock.companyName}
                    </span>
                  </div>
                  <div className={styles.resultPrice}>
                    <span className={styles.price}>
                      {stock.currentPrice !== null ? (
                        <>
                          ₹
                          {stock.currentPrice.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </>
                      ) : (
                        <span className={styles.noPrice}>N/A</span>
                      )}
                    </span>
                    {stock.changePercent !== null && (
                      <span
                        className={`${styles.change} ${
                          stock.changePercent >= 0
                            ? styles.positive
                            : styles.negative
                        }`}
                      >
                        {stock.changePercent >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(stock.changePercent).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapperRef} className={`${styles.searchWrapper} ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={computePosition}
        placeholder={isMobile ? "Search" : placeholder}
        className={styles.searchInput}
        autoComplete="off"
        spellCheck={false}
      />
      {isLoading ? (
        <span className={styles.loadingSpinner}>⏳</span>
      ) : (
        <span className={styles.kbdHint}>Ctrl K</span>
      )}
      {dropdown}
    </div>
  );
}
