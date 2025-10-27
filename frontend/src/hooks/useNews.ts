"use client";

import useSWR from "swr";
import { fetchLatestNews } from "../services/api/newsApi";
import type { NewsItem } from "../app/dashboard/types";

export function useNews(limit = 12) {
  const { data, error, isLoading, mutate } = useSWR<NewsItem[]>(
    ["/news/latest", limit] as const,
    (key: readonly ["/news/latest", number]) => fetchLatestNews(key[1]),
    {
      refreshInterval: 120_000,
      revalidateOnFocus: true,
    }
  );

  return {
    news: data ?? [],
    isLoading,
    isError: Boolean(error),
    refresh: mutate,
  };
}
