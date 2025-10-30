"use client";

import React from "react";
import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchStockHistory, type Candle } from "@/services/api/stockHistoryApi";

const fetcher = async (key: string) => {
  const [symbol, interval, limitStr] = key.split("|");
  const limit = parseInt(limitStr || "180", 10);
  // Map UI "year" to backend "month" with 12 candles
  const effectiveInterval = (interval === "year" ? "month" : interval) as
    | "day"
    | "week"
    | "month";
  const effectiveLimit = interval === "year" ? 12 : limit;
  const data = await fetchStockHistory(symbol, effectiveInterval, {
    limit: effectiveLimit,
  });
  return data;
};

function formatXAxisLabel(val: string) {
  // val is YYYY-MM-DD
  return val.slice(5); // MM-DD
}

function formatTooltipLabel(val: string) {
  return val; // show full date
}

export default function StockChart({ symbol }: { symbol: string }) {
  const [interval, setInterval] = useState<"day" | "week" | "month" | "year">("day");

  const limit = useMemo(() => {
    if (interval === "day") return 180; // ~6M daily
    if (interval === "week") return 156; // ~3Y weekly
    if (interval === "month") return 24; // ~2Y monthly
    return 12; // year view -> 12 monthly candles
  }, [interval]);

  const { data, isLoading, error } = useSWR<Candle[]>(
    `${symbol.toUpperCase()}|${interval}|${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  // Recharts expects array of objects; we map close as primary
  const chartData = (data || []).map((d) => ({
    time: d.time,
    close: d.close,
  }));

  return (
    <div style={{ width: "100%", height: 360 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {(["day", "week", "month", "year"] as const).map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setInterval(tf)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background:
                interval === tf ? "rgba(255,255,255,0.12)" : "transparent",
              color: "inherit",
              fontSize: 12,
            }}
          >
            {tf.toUpperCase()}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#f87171" }}>
          Failed to load chart
        </div>
      )}
      {isLoading && (
        <div style={{ fontSize: 12, opacity: 0.6 }}>Loading chart…</div>
      )}

      {!isLoading && chartData.length > 0 && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.08} />
            <XAxis
              dataKey="time"
              tickFormatter={formatXAxisLabel}
              minTickGap={24}
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
            />
            <YAxis
              domain={["dataMin", "dataMax"]}
              width={60}
              stroke="#94a3b8"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              labelFormatter={formatTooltipLabel}
              formatter={(v) => [Number(v).toFixed(2), "Close"]}
              contentStyle={{
                background: "rgba(15,23,42,0.9)",
                border: "1px solid rgba(148,163,184,0.2)",
                borderRadius: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="close"
              stroke="#22c55e"
              fillOpacity={1}
              fill="url(#colorClose)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {!isLoading && chartData.length === 0 && (
        <div style={{ fontSize: 12, opacity: 0.6 }}>No data</div>
      )}
    </div>
  );
}
