"use client";

import { useEffect, useRef, useState } from "react";
import http from "@/lib/http";
import type { StockDetailData } from "@/services/api/stockDetailApi";

export type LiveStockStats = Pick<
  StockDetailData,
  | "stock_id"
  | "symbol"
  | "companyName"
  | "exchange"
  | "currentPrice"
  | "previousClose"
  | "dayOpen"
  | "dayHigh"
  | "dayLow"
  | "changePercent"
  | "changeValue"
  | "asOf"
>;

export function useLiveStockStats(symbol: string, initial?: LiveStockStats) {
  const [data, setData] = useState<LiveStockStats | undefined>(initial);
  const intervalRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Helper to compute change fields if missing
  const applyDerived = (
    d: LiveStockStats | undefined
  ): LiveStockStats | undefined => {
    if (!d) return d;
    const prev = typeof d.previousClose === "number" ? d.previousClose : null;
    const curr = typeof d.currentPrice === "number" ? d.currentPrice : null;
    if (prev && prev !== 0 && curr != null) {
      const changeValue = curr - prev;
      const changePercent = (changeValue / prev) * 100;
      return { ...d, changeValue, changePercent };
    }
    return d;
  };

  useEffect(() => {
    let mounted = true;

    const fetchOnce = async () => {
      // Cancel previous request if any
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const { data: resp } = await http.get(
          `/stocks/detail/${symbol.toUpperCase()}`,
          { signal: controller.signal }
        );
        if (!mounted) return;
        if (resp?.status === "success" && resp?.data) {
          setData(applyDerived(resp.data));
        }
      } catch {
        // Ignore cancellations and transient errors
      }
    };

    // Immediate fetch on mount for freshest data
    fetchOnce();

    // Poll every 10s
    intervalRef.current = window.setInterval(fetchOnce, 10000);

    return () => {
      mounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
    // restart polling if symbol changes
  }, [symbol]);

  return data ?? initial;
}
