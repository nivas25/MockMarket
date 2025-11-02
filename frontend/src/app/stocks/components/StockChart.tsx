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
import styles from "./StockChart.module.css"; // Import the CSS module
import { useTheme } from "@/components/contexts/ThemeProvider"; // Import useTheme

type Interval = "1D" | "1W" | "1M" | "1Y";

const INTERVAL_MAP: Record<
  Interval,
  { backend: "day" | "week" | "month"; limit: number }
> = {
  "1D": { backend: "day", limit: 5 },
  "1W": { backend: "day", limit: 10 },
  "1M": { backend: "day", limit: 30 },
  "1Y": { backend: "day", limit: 365 },
};

const fetcher = async (key: string) => {
  const [symbol, backend, limitStr] = key.split("|");
  const limit = parseInt(limitStr, 10);
  const data = await fetchStockHistory(
    symbol,
    backend as "day" | "week" | "month",
    { limit }
  );
  return data;
};

function formatXAxisLabel(val: string) {
  return val.slice(5); // MM-DD
}

function formatTooltipLabel(val: string) {
  return val; // show full date
}

export default function StockChart({ symbol }: { symbol: string }) {
  const [interval, setInterval] = useState<Interval>("1M");
  const { theme } = useTheme();
  const { backend, limit } = INTERVAL_MAP[interval];

  const { data, isLoading, error } = useSWR<Candle[]>(
    `${symbol.toUpperCase()}|${backend}|${limit}`,
    fetcher,
    {
      revalidateOnFocus: false,
    }
  );

  const chartData = (data || []).map((d) => ({
    time: d.time,
    close: d.close,
  }));

  // --- THIS IS THE FIX ---
  // It checks if the last price is higher than the first price
  const isTrendUp =
    chartData.length > 0 &&
    chartData[chartData.length - 1].close >= chartData[0].close;

  // Use Gold for up, Red for down
  const trendColor = isTrendUp ? "#d4af37" : "#ef4444";
  // -----------------------

  // Define theme-aware colors
  const isDark = theme === "dark";
  const axisColor = isDark ? "#94a3b8" : "#666";
  const gridOpacity = isDark ? 0.08 : 0.05;
  const tooltipStyle: React.CSSProperties = {
    background: isDark ? "rgba(15,23,42,0.9)" : "rgba(255,255,255,0.9)",
    border: `1px solid ${isDark ? "rgba(148,163,184,0.2)" : "rgba(0,0,0,0.1)"}`,
    borderRadius: 8,
    color: isDark ? "#f0f0f0" : "#333",
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Buttons (already styled correctly from module) */}
      <div className={styles.intervalButtons}>
        {(["1D", "1W", "1M", "1Y"] as Interval[]).map((int) => (
          <button
            key={int}
            type="button"
            onClick={() => setInterval(int)}
            className={`${styles.intervalBtn} ${
              interval === int ? styles.active : ""
            }`}
          >
            {int}
          </button>
        ))}
      </div>

      {error && <div className={styles.errorMessage}>Failed to load chart</div>}
      {isLoading && (
        <div className={styles.statusMessage}>
          <div className={styles.spinner}></div>
          <span>Loading chart data...</span>
        </div>
      )}

      {!isLoading && chartData.length > 0 && (
        <div className={styles.chart}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {/* --- USES THE DYNAMIC trendColor --- */}
                <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={trendColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
                </linearGradient>
                {/* ---------------------------------- */}
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={gridOpacity} />
              <XAxis
                dataKey="time"
                tickFormatter={formatXAxisLabel}
                minTickGap={24}
                stroke={axisColor}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={["dataMin", "dataMax"]}
                width={60}
                stroke={axisColor}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                labelFormatter={formatTooltipLabel}
                formatter={(v) => [Number(v).toFixed(2), "Close"]}
                contentStyle={tooltipStyle}
                itemStyle={{ color: isDark ? "#f0f0f0" : "#333" }}
              />
              {/* --- USES THE DYNAMIC trendColor --- */}
              <Area
                type="monotone"
                dataKey="close"
                stroke={trendColor}
                fillOpacity={1}
                fill="url(#colorTrend)"
                strokeWidth={2}
              />
              {/* ---------------------------------- */}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isLoading && chartData.length === 0 && (
        <div className={styles.statusMessage}>No data</div>
      )}
    </div>
  );
}
