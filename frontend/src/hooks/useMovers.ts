"use client";

import useSWR from "swr";
import {
  fetchTopGainers,
  fetchTopLosers,
  fetchMostActive,
} from "../services/api/stockMoversApi";
import type { StockMover, ActiveStock } from "../app/dashboard/types";

type MoversData = {
  gainers: StockMover[];
  losers: StockMover[];
  mostActive: ActiveStock[];
};

async function loadMovers(
  limit: number,
  exchange: string
): Promise<MoversData> {
  const [gainers, losers, active] = await Promise.all([
    fetchTopGainers(limit, exchange, false),
    fetchTopLosers(limit, exchange, false),
    fetchMostActive(limit, exchange),
  ]);

  const activeStocks: ActiveStock[] = active.map((stock) => ({
    name: stock.name,
    symbol: stock.symbol,
    price: stock.price,
    change: stock.change,
    volume: stock.volume ? stock.volume.toLocaleString() : "0",
  }));

  return { gainers, losers, mostActive: activeStocks };
}

export function useMovers(limit = 10, exchange = "NSE") {
  const { data, error, isLoading, mutate } = useSWR<MoversData>(
    ["/stocks/movers", limit, exchange] as const,
    (key: readonly ["/stocks/movers", number, string]) =>
      loadMovers(key[1], key[2]),
    { refreshInterval: 10_000, revalidateOnFocus: true }
  );

  return {
    gainers: data?.gainers ?? [],
    losers: data?.losers ?? [],
    mostActive: data?.mostActive ?? [],
    isLoading,
    isError: Boolean(error),
    refresh: mutate,
  };
}
