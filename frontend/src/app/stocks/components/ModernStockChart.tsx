"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  LineStyle,
  IPriceLine,
} from "lightweight-charts";
import useSWR from "swr";
import { fetchStockHistory, type Candle } from "@/services/api/stockHistoryApi";
import styles from "./StockChart.module.css";
import { useTheme } from "@/components/contexts/ThemeProvider";

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

interface Props {
  symbol: string;
  currentPrice?: number;
}

// (These MUST match your globals.css)
const primaryGold = "#d4af37";
const secondaryGold = "#e5c16c";

export default function ModernStockChart({ symbol, currentPrice }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [interval, setInterval] = useState<Interval>("1M");
  const priceLineRef = useRef<IPriceLine | null>(null);

  const { theme } = useTheme();

  const { backend, limit } = INTERVAL_MAP[interval];

  const {
    data: candles,
    isLoading,
    error,
  } = useSWR<Candle[]>(`${symbol.toUpperCase()}|${backend}|${limit}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: interval === "1D" ? 10000 : 0,
  });

  // Initialize chart (runs once on mount)
  useEffect(() => {
    if (!chartContainerRef.current || !currentPrice) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 300,
      watermark: {
        visible: false, // This removes the main watermark
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: primaryGold, // Use hardcoded color
      downColor: "#ef4444",
      borderUpColor: primaryGold, // Use hardcoded color
      borderDownColor: "#ef4444",
      wickUpColor: primaryGold, // Use hardcoded color
      wickDownColor: "#ef4444",
    });

    const isDark = theme === "dark";
    priceLineRef.current = candlestickSeries.createPriceLine({
      price: currentPrice,
      color: isDark ? secondaryGold : primaryGold, // Use hardcoded color
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: "Current",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight || 300,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []); // Runs only once // eslint-disable-line react-hooks/exhaustive-deps

  // Update the price line when price changes
  useEffect(() => {
    if (!priceLineRef.current || !currentPrice) return;
    priceLineRef.current.applyOptions({
      price: currentPrice,
    });
  }, [currentPrice]);

  // Apply theme colors
  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    const isDark = theme === "dark";

    if (priceLineRef.current) {
      priceLineRef.current.applyOptions({
        color: isDark ? secondaryGold : primaryGold, // Use hardcoded color
      });
    }

    chartRef.current.applyOptions({
      layout: {
        textColor: isDark ? "#94a3b8" : "#333",
      },
      grid: {
        vertLines: {
          color: isDark ? "rgba(148, 163, 184, 0.05)" : "rgba(0, 0, 0, 0.05)",
        },
        horzLines: {
          color: isDark ? "rgba(148, 163, 184, 0.05)" : "rgba(0, 0, 0, 0.05)",
        },
      },
      timeScale: {
        borderColor: isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(0, 0, 0, 0.1)",
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(148, 163, 184, 0.2)" : "rgba(0, 0, 0, 0.1)",
      },
      crosshair: {
        vertLine: {
          labelBackgroundColor: isDark ? "#1e293b" : "#f0f0f0",
        },
        horzLine: {
          labelBackgroundColor: isDark ? "#1e293b" : "#f0f0f0",
        },
      },
    });
  }, [theme, chartRef]); // Re-runs when theme or chart ref changes

  // Update chart data
  useEffect(() => {
    if (!candlestickSeriesRef.current) return;
    if (!candles || candles.length === 0) {
      candlestickSeriesRef.current.setData([]);
      return;
    }

    try {
      const chartData: CandlestickData[] = candles.map((candle) => {
        const timeStr = candle.time.split("T")[0] || candle.time;
        return {
          time: timeStr as Time,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        };
      });
      candlestickSeriesRef.current.setData(chartData);
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (error) {
      console.error("❌ Error setting chart data:", error);
    }
  }, [candles]);

  return (
    <div className={styles.chartContainer}>
      {/* Interval Buttons */}
      <div className={styles.intervalButtons}>
        {(["1D", "1W", "1M", "1Y"] as Interval[]).map((int) => (
          <button
            key={int}
            onClick={() => setInterval(int)}
            className={`${styles.intervalBtn} ${
              interval === int ? styles.active : ""
            }`}
          >
            {int}
          </button>
        ))}
      </div>

      {/* Loading / Error States */}
      {isLoading && (
        <div className={styles.statusMessage}>
          <div className={styles.spinner}></div>
          <span>Loading chart data...</span>
        </div>
      )}
      {error && !isLoading && (
        <div className={styles.errorMessage}>
          <span>⚠️ Failed to load chart</span>
        </div>
      )}
      {!isLoading && candles && candles.length === 0 && (
        <div className={styles.statusMessage}>
          <span>📊 No historical data available</span>
          <p className={styles.hint}>
            Data will be populated during market hours
          </p>
        </div>
      )}

      {/* Chart */}
      <div
        ref={chartContainerRef}
        className={styles.chart}
        style={{
          visibility:
            candles && candles.length > 0 && !isLoading ? "visible" : "hidden",
        }}
      />
    </div>
  );
}
