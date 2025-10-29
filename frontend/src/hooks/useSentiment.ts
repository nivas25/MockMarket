"use client";

import useSWR from "swr";
import {
  fetchMarketSentiment,
  type SentimentData,
} from "../services/api/sentimentApi";

export function useSentiment() {
  const { data, error, isLoading, mutate } = useSWR<SentimentData>(
    "/sentiment/market",
    () => fetchMarketSentiment(),
    {
      refreshInterval: 30_000,
      revalidateOnFocus: true,
    }
  );

  return {
    sentiment: data ?? null,
    isLoading,
    isError: Boolean(error),
    refresh: mutate,
  };
}
