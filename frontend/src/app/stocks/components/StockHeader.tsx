"use client";

import styles from "./StockHeader.module.css";
import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import AddToWatchlistButton from "@/components/watchlist/AddToWatchlistButton";
import { useEffect, useMemo, useState } from "react";
import { fetchStockDetail } from "@/services/api/stockDetailApi";
import { getMarketStatus } from "@/utils/marketHours";
import { getSocket } from "@/lib/socketClient";

type StockData = {
  symbol: string;
  companyName: string;
  exchange: string;
  currentPrice: number;
  previousClose: number;
  changePercent: number;
  changeValue: number;
  stock_id?: number; // Add stock_id for watchlist
  priceSource?: string;
  timestamp?: string;
};

type StockHeaderProps = {
  stock: StockData;
};

export default function StockHeader({ stock }: StockHeaderProps) {
  console.log("[StockHeader] Rendering with stock:", stock);
  console.log("[StockHeader] stock_id:", stock.stock_id);

  // Warm-up socket connection ASAP so clients get live ticks quickly
  useEffect(() => {
    try {
      getSocket();
    } catch (e) {
      console.warn("getSocket warmup failed:", e);
    }
  }, []);

  const live = useRealtimePrices([stock.symbol]);
  const liveLtp = live[stock.symbol?.toUpperCase()]?.ltp;
  const [overridePrice, setOverridePrice] = useState<number | null>(null);
  const hasLive = typeof liveLtp === "number";
  const current = hasLive
    ? (liveLtp as number)
    : overridePrice ?? stock.currentPrice;
  const changeValue =
    typeof current === "number" && typeof stock.previousClose === "number"
      ? current - stock.previousClose
      : stock.changeValue;
  const changePercent =
    typeof current === "number" &&
    typeof stock.previousClose === "number" &&
    stock.previousClose !== 0
      ? ((current - stock.previousClose) / stock.previousClose) * 100
      : stock.changePercent;
  const isPositive = (changePercent ?? 0) >= 0;
  const priceParts = current
    .toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .split(".");
  const intPart = priceParts[0] ?? "0";
  const fracPart = priceParts[1] ?? "00";
  const initials = stock.companyName?.[0]?.toUpperCase() || "";

  // Decide badge
  const badge = useMemo(() => {
    if (hasLive) return { label: "LIVE", kind: "live" as const };
    if (overridePrice !== null) return { label: "LIVE", kind: "live" as const };
    const src = (stock.priceSource || "").toLowerCase();
    if (src === "websocket_cache" || src === "upstox_api")
      return { label: "LIVE", kind: "live" as const };
    return { label: "CACHED", kind: "cached" as const };
  }, [hasLive, overridePrice, stock.priceSource]);

  // Debug logging
  useEffect(() => {
    console.log(
      `[StockHeader] ${stock.symbol} - hasLive: ${hasLive}, priceSource: ${
        stock.priceSource
      }, badge: ${badge.kind}, currentPrice: ${current.toFixed(2)}`
    );
  }, [stock.symbol, hasLive, stock.priceSource, badge.kind, current]);

  // Client revalidation: on mount, if market is open and initial source is database and no live yet, fetch with forceLive
  useEffect(() => {
    const src = (stock.priceSource || "").toLowerCase();
    const marketOpen = getMarketStatus().isOpen;
    if (hasLive || src !== "database" || !marketOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchStockDetail(stock.symbol, { forceLive: true });
        if (!cancelled && fresh?.currentPrice != null) {
          setOverridePrice(fresh.currentPrice);
        }
      } catch (e) {
        console.warn("StockHeader forceLive fetch failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stock.symbol, stock.priceSource, hasLive]);

  return (
    <div className={styles.header}>
      {/* Identity block */}
      <div className={styles.identity}>
        <div className={styles.logo}>{initials}</div>
        <div className={styles.titleBlock}>
          <h1 className={styles.companyName}>{stock.companyName}</h1>
          <div className={styles.metaRow}>
            <span className={styles.symbolChip}>{stock.symbol}</span>
            <span className={styles.dotSep} />
            <span className={styles.exchangeChip}>{stock.exchange}</span>
          </div>
        </div>
      </div>

      {/* Right side: Watchlist button + divider + Price block */}
      <div className={styles.rightSection}>
        {/* Add to Watchlist Button - LEFT */}
        {stock.stock_id && (
          <div className={styles.watchlistButtonWrapper}>
            <AddToWatchlistButton
              stockId={stock.stock_id}
              stockSymbol={stock.symbol}
            />
          </div>
        )}

        {/* Price block - RIGHT (with existing border-left divider) */}
        <div className={styles.priceBlock}>
          <div className={styles.currentPrice}>
            <div className={styles.priceRow}>
              <span className={styles.rupee}>₹</span>
              <span className={styles.priceInt}>{intPart}</span>
              <span className={styles.priceFrac}>.{fracPart}</span>
              <span
                className={`${styles.liveBadge} ${
                  badge.kind === "live" ? styles.live : styles.cached
                }`}
                title={
                  stock.priceSource ? `source: ${stock.priceSource}` : undefined
                }
              >
                {badge.label}
              </span>
            </div>
          </div>
          <div
            className={`${styles.change} ${
              isPositive ? styles.positive : styles.negative
            }`}
          >
            <span className={styles.arrow}>{isPositive ? "▲" : "▼"}</span>
            <span className={styles.changeValue}>
              ₹{Math.abs(changeValue || 0).toFixed(2)}
            </span>
            <span className={styles.changePercent}>
              ({isPositive ? "+" : ""}
              {(changePercent || 0).toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
