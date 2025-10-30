"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "@/lib/socketClient";

export type LivePrice = { symbol: string; ltp: number; as_of?: string };

export function useRealtimePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, LivePrice>>({});
  const symbolsKey = useMemo(
    () => symbols.map((s) => s.toUpperCase()).sort().join(","),
    [symbols]
  );
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const socket = getSocket();

    const onBatch = (updates: Array<{ symbol?: string; ltp?: number; as_of?: string }>) => {
      if (!isMounted.current) return;
      if (!updates || !Array.isArray(updates)) return;
      setPrices((prev) => {
        const next = { ...prev } as Record<string, LivePrice>;
        for (const u of updates) {
          const sym = (u.symbol || "").toUpperCase();
          if (!sym) continue;
          if (symbolsKey && !symbolsKey.includes(sym)) continue;
          if (typeof u.ltp !== "number") continue;
          next[sym] = { symbol: sym, ltp: u.ltp, as_of: u.as_of };
        }
        return next;
      });
    };

    socket.on("prices_batch", onBatch);
    return () => {
      isMounted.current = false;
      socket.off("prices_batch", onBatch);
    };
  }, [symbolsKey]);

  return prices;
}


