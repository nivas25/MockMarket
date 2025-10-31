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
  console.log(`📊 Fetching stock history: ${url}`, params);

  try {
    const res = await http.get(url, { params });
    console.log(`✅ Stock history response for ${symbol}:`, res.data);

    const payload = res.data as {
      status: string;
      data: Candle[];
    };

    if (payload.status !== "success") {
      console.warn(`⚠️ Stock history API returned status: ${payload.status}`);
      return [];
    }

    console.log(
      `📈 Received ${payload.data?.length || 0} candles for ${symbol}`
    );
    return payload.data || [];
  } catch (error) {
    console.error(`❌ Error fetching stock history for ${symbol}:`, error);
    return [];
  }
}
