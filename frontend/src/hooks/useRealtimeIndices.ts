"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socketClient";
import type { IndexData } from "@/services/api/indexApi";

interface IndicesUpdatePayload {
  status: string;
  data: Array<{
    name: string;
    ltp: number;
    open: number;
    high: number;
    low: number;
    prev_close: number;
    change_value: number;
    change_percent: number;
    tag: string;
    last_updated: string;
  }>;
  timestamp: string;
}

/**
 * Hook to receive real-time index updates via WebSocket during market hours
 * Falls back to polling when market is closed
 */
export function useRealtimeIndices() {
  const [indices, setIndices] = useState<IndexData[] | null>(null);
  const [isLive, setIsLive] = useState(false);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    const socket = getSocket();

    // Listen for live index updates from backend
    const onIndicesUpdate = (payload: IndicesUpdatePayload) => {
      if (!isMounted.current) return;

      console.log(
        `[useRealtimeIndices] Received ${payload.data?.length || 0} indices`,
        payload
      );

      try {
        // Transform backend data to frontend IndexData format
        const transformed: IndexData[] = payload.data.map((item) => ({
          name: item.name,
          value: item.ltp.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
          change: `${
            item.change_percent >= 0 ? "+" : ""
          }${item.change_percent.toFixed(2)}%`,
          direction: item.change_percent >= 0 ? "up" : "down",
          tag: item.tag,
          lastUpdated: item.last_updated,
          // Numeric fields for precise formatting
          valueNum: item.ltp,
          changePercentNum: item.change_percent,
          changeValueNum: item.change_value,
        }));

        setIndices(transformed);
        setIsLive(payload.status === "live");
      } catch (error) {
        console.error("Error processing indices update:", error);
      }
    };

    // Connect to WebSocket
    socket.on("indices_update", onIndicesUpdate);

    // Cleanup on unmount
    return () => {
      isMounted.current = false;
      socket.off("indices_update", onIndicesUpdate);
    };
  }, []);

  return { indices, isLive };
}
