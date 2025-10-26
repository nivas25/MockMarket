"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { mockSearchStocks } from "@/data/mockStocks";
import styles from "./StockSearch.module.css";

type StockResult = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  changePercent: number;
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
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isMobile, setIsMobile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
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

  // Using shared mock data list for development
  const mockStocks = useRef<StockResult[]>(mockSearchStocks);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        setIsOpen(false);
        setSelectedIndex(-1);
        return;
      }

      // Search logic - matches symbol or company name
      const filtered = mockStocks.current.filter(
        (stock) =>
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.companyName.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered.slice(0, 8)); // Limit to 8 results
      setIsOpen(filtered.length > 0);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Calculate dropdown position
  const computePosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
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
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
  const handleSelect = (stock: StockResult) => {
    setQuery("");
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
    router.push(`/stocks/${stock.symbol}`);
  };

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
          >
            {results.map((stock, idx) => (
              <div
                key={stock.symbol}
                className={`${styles.resultItem} ${
                  idx === selectedIndex ? styles.selected : ""
                }`}
                onClick={() => handleSelect(stock)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className={styles.resultMain}>
                  <span className={styles.symbol}>{stock.symbol}</span>
                  <span className={styles.companyName}>
                    {stock.companyName}
                  </span>
                </div>
                <div className={styles.resultPrice}>
                  <span className={styles.price}>
                    ₹
                    {stock.currentPrice.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
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
                </div>
              </div>
            ))}
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
      <span className={styles.kbdHint}>Ctrl K</span>
      {dropdown}
    </div>
  );
}
