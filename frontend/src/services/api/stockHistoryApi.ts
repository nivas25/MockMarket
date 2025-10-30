import http from "@/lib/http";

export type Candle = {
  time: string; // YYYY-MM-DD for day/week/month
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export async function fetchStockHistory(
  symbol: string,
  interval: "day" | "week" | "month" = "day",
  opts?: { limit?: number; from?: string; to?: string }
): Promise<Candle[]> {
  const params: Record<string, string | number> = { interval };
  if (opts?.limit) params.limit = opts.limit;
  if (opts?.from) params.from = opts.from;
  if (opts?.to) params.to = opts.to;

  const url = `/stocks/history/${encodeURIComponent(symbol.toUpperCase())}`;
  const res = await http.get(url, { params });
  const payload = res.data as {
    status: string;
    data: Candle[];
  };
  if (payload.status !== "success") return [];
  return payload.data || [];
}
