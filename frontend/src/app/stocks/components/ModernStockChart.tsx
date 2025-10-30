"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
} from "lightweight-charts";
import useSWR from "swr";
import { fetchStockHistory, type Candle } from "@/services/api/stockHistoryApi";
import styles from "./StockChart.module.css";

type Interval = "1D" | "1W" | "1M" | "1Y";

const INTERVAL_MAP: Record<
  Interval,
  { backend: "day" | "week" | "month"; limit: number }
> = {
  "1D": { backend: "day", limit: 5 }, // Last 5 days (1 week with trading days)
  "1W": { backend: "day", limit: 10 }, // Last 10 days (~2 weeks)
  "1M": { backend: "day", limit: 30 }, // Last 30 days
  "1Y": { backend: "day", limit: 365 }, // Last 365 days
};

const fetcher = async (key: string) => {
  console.log(`🔑 SWR Fetcher called with key: ${key}`);
  const [symbol, backend, limitStr] = key.split("|");
  const limit = parseInt(limitStr, 10);
  console.log(
    `📞 Calling fetchStockHistory(${symbol}, ${backend}, {limit: ${limit}})`
  );

  const data = await fetchStockHistory(
    symbol,
    backend as "day" | "week" | "month",
    { limit }
  );

  console.log(`📦 Fetcher received ${data?.length || 0} candles`);
  return data;
};

interface Props {
  symbol: string;
  currentPrice?: number;
}

export default function ModernStockChart({ symbol, currentPrice }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [interval, setInterval] = useState<Interval>("1M");

  const { backend, limit } = INTERVAL_MAP[interval];

  const {
    data: candles,
    isLoading,
    error,
  } = useSWR<Candle[]>(`${symbol.toUpperCase()}|${backend}|${limit}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: interval === "1D" ? 10000 : 0, // Refresh 1D chart every 10s
  });

  // Debug logging
  console.log(`🎯 ModernStockChart - Symbol: ${symbol}, Interval: ${interval}`);
  console.log(`📊 Chart State - Loading: ${isLoading}, Error:`, error);
  console.log(`📈 Candles Data:`, candles);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.05)" },
        horzLines: { color: "rgba(148, 163, 184, 0.05)" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      crosshair: {
        vertLine: {
          color: "rgba(148, 163, 184, 0.3)",
          width: 1,
          style: 1,
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "rgba(148, 163, 184, 0.3)",
          width: 1,
          style: 1,
          labelBackgroundColor: "#1e293b",
        },
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    console.log(`🔄 Chart update effect triggered. Candles:`, candles?.length);

    if (!candlestickSeriesRef.current) {
      console.warn("⚠️ Candlestick series ref is null");
      return;
    }

    if (!candles || candles.length === 0) {
      console.warn("⚠️ No candles data to display");
      return;
    }

    console.log(`✅ Processing ${candles.length} candles for chart`);
    console.log("📊 First candle:", candles[0]);
    console.log("📊 Last candle:", candles[candles.length - 1]);

    try {
      const chartData: CandlestickData[] = candles.map((candle) => {
        // Ensure time is in YYYY-MM-DD format (remove any time component)
        const timeStr = candle.time.split("T")[0] || candle.time;

        return {
          time: timeStr as Time,
          open: Number(candle.open),
          high: Number(candle.high),
          low: Number(candle.low),
          close: Number(candle.close),
        };
      });

      console.log("📈 Chart data prepared:", chartData.length, "items");
      console.log("📈 First chart data:", chartData[0]);
      console.log("📈 Last chart data:", chartData[chartData.length - 1]);

      candlestickSeriesRef.current.setData(chartData);

      // Fit content
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
        console.log("✅ Chart data set and fitted!");
      }
    } catch (error) {
      console.error("❌ Error setting chart data:", error);
      console.error("Problematic candles data:", candles);
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

      {/* Current Price Indicator */}
      {currentPrice && candles && candles.length > 0 && !isLoading && (
        <div className={styles.priceInfo}>
          <span className={styles.label}>Current Price:</span>
          <span className={styles.price}>
            ₹
            {currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  );
}
