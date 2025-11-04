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
  const params: Record<string, string | number | boolean> = { interval };
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
      count?: number;
      message?: string;
    };

    if (payload.status !== "success") {
      console.warn(`⚠️ Stock history API returned status: ${payload.status}`);
      return [];
    }

    console.log(
      `📈 Received ${payload.data?.length || 0} candles for ${symbol}`,
      payload.count ? `(count: ${payload.count})` : ""
    );

    if (payload.data && payload.data.length > 0) {
      console.log(
        `   First: ${payload.data[0].time}, Last: ${
          payload.data[payload.data.length - 1].time
        }`
      );
    } else {
      console.warn(`⚠️ No candle data in response for ${symbol}`, payload);
    }

    return payload.data || [];
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    const isTimeout =
      err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "");
    if (isTimeout) {
      try {
        // Fast fallback: avoid external fetch by asking backend to use DB-only data
        const res = await http.get(url, {
          params: { ...params, skip_fetch: true },
          timeout: 8000,
        });
        const payload = res.data as { status: string; data: Candle[] };
        if (payload.status === "success") {
          console.warn(
            `⏱️ Timeout on live fetch. Served cached DB data for ${symbol}.`
          );
          return payload.data || [];
        }
      } catch {
        // Fall through to logging below
      }
    }
    console.error(`❌ Error fetching stock history for ${symbol}:`, error);
    return [];
  }
}
