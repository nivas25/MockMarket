"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "@/lib/socketClient";

export type LivePrice = { symbol: string; ltp: number; as_of?: string };

export function useRealtimePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  // Stable key and fast membership set to avoid substring bugs with includes
  const symbolsKey = useMemo(
    () =>
      symbols
        .map((s) => s.toUpperCase())
        .sort()
        .join(","),
    [symbols]
  );
  const allowedSet = useMemo(() => {
    return new Set(symbolsKey ? symbolsKey.split(",") : []);
  }, [symbolsKey]);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const socket = getSocket();

    const onBatch = (
      updates: Array<{ symbol?: string; ltp?: number; as_of?: string }>
    ) => {
      if (!isMounted.current) return;
      if (!updates || !Array.isArray(updates)) return;

      console.log(
        `[useRealtimePrices] Received ${updates.length} price updates`
      );

      setPrices((prev) => {
        const next = { ...prev } as Record<string, LivePrice>;
        let updateCount = 0;
        for (const u of updates) {
          const sym = (u.symbol || "").toUpperCase();
          if (!sym) continue;
          if (allowedSet.size > 0 && !allowedSet.has(sym)) continue;
          if (typeof u.ltp !== "number") continue;
          next[sym] = { symbol: sym, ltp: u.ltp, as_of: u.as_of };
          updateCount++;
          console.log(`[useRealtimePrices] Updated ${sym}: ₹${u.ltp}`);
        }
        if (updateCount > 0) {
          console.log(
            `[useRealtimePrices] Applied ${updateCount} updates for symbols: ${symbolsKey}`
          );
        }
        return next;
      });
    };

    console.log(`[useRealtimePrices] Subscribing to prices for: ${symbolsKey}`);
    socket.on("prices_batch", onBatch);
    return () => {
      isMounted.current = false;
      socket.off("prices_batch", onBatch);
      console.log(
        `[useRealtimePrices] Unsubscribed from prices for: ${symbolsKey}`
      );
    };
  }, [symbolsKey, allowedSet]);

  return prices;
}
