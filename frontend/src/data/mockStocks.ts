export type StockSearchItem = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  changePercent: number;
  exchange: string;
};

export type StockDetail = StockSearchItem & {
  previousClose: number;
  changeValue: number;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
  volume: number;
  marketCap: string; // formatted string for now
  peRatio: number;
  week52High: number;
  week52Low: number;
};

// A compact list for search (extend as needed)
export const mockSearchStocks: StockSearchItem[] = [
  {
    symbol: "RELIANCE",
    companyName: "Reliance Industries Ltd",
    currentPrice: 2450.3,
    changePercent: 2.15,
    exchange: "NSE",
  },
  {
    symbol: "TCS",
    companyName: "Tata Consultancy Services",
    currentPrice: 3680.5,
    changePercent: -0.85,
    exchange: "NSE",
  },
  {
    symbol: "INFY",
    companyName: "Infosys Ltd",
    currentPrice: 1520.75,
    changePercent: 1.2,
    exchange: "NSE",
  },
  {
    symbol: "HDFCBANK",
    companyName: "HDFC Bank Ltd",
    currentPrice: 1650.9,
    changePercent: 0.45,
    exchange: "NSE",
  },
  {
    symbol: "ICICIBANK",
    companyName: "ICICI Bank Ltd",
    currentPrice: 980.25,
    changePercent: -1.1,
    exchange: "NSE",
  },
  {
    symbol: "HINDUNILVR",
    companyName: "Hindustan Unilever Ltd",
    currentPrice: 2380.6,
    changePercent: 0.9,
    exchange: "NSE",
  },
  {
    symbol: "BHARTIARTL",
    companyName: "Bharti Airtel Ltd",
    currentPrice: 1245.8,
    changePercent: 3.25,
    exchange: "NSE",
  },
  {
    symbol: "SBIN",
    companyName: "State Bank of India",
    currentPrice: 625.4,
    changePercent: 1.8,
    exchange: "NSE",
  },
  {
    symbol: "WIPRO",
    companyName: "Wipro Ltd",
    currentPrice: 445.3,
    changePercent: -0.6,
    exchange: "NSE",
  },
  {
    symbol: "ASIANPAINT",
    companyName: "Asian Paints Ltd",
    currentPrice: 3120.5,
    changePercent: 0.35,
    exchange: "NSE",
  },
];

// A richer map for the stock details page
const mockDetailMap: Record<string, StockDetail> = {
  RELIANCE: {
    symbol: "RELIANCE",
    companyName: "Reliance Industries Ltd",
    exchange: "NSE",
    currentPrice: 2450.3,
    previousClose: 2399.5,
    changePercent: 2.12,
    changeValue: 50.8,
    dayHigh: 2465.8,
    dayLow: 2425.1,
    dayOpen: 2430.0,
    volume: 12458920,
    marketCap: "16,54,320 Cr",
    peRatio: 25.43,
    week52High: 2856.5,
    week52Low: 2150.3,
  },
  TCS: {
    symbol: "TCS",
    companyName: "Tata Consultancy Services",
    exchange: "NSE",
    currentPrice: 3680.5,
    previousClose: 3712.2,
    changePercent: -0.85,
    changeValue: -31.7,
    dayHigh: 3720.0,
    dayLow: 3665.3,
    dayOpen: 3705.0,
    volume: 3245680,
    marketCap: "13,42,180 Cr",
    peRatio: 28.65,
    week52High: 4078.0,
    week52Low: 3100.0,
  },
  INFY: {
    symbol: "INFY",
    companyName: "Infosys Ltd",
    exchange: "NSE",
    currentPrice: 1520.75,
    previousClose: 1502.7,
    changePercent: 1.2,
    changeValue: 18.05,
    dayHigh: 1532.0,
    dayLow: 1508.2,
    dayOpen: 1510.0,
    volume: 8421560,
    marketCap: "6,32,900 Cr",
    peRatio: 27.12,
    week52High: 1650.0,
    week52Low: 1280.0,
  },
};

export function getMockStockDetail(symbol: string): StockDetail {
  const key = symbol?.toUpperCase();
  if (key && mockDetailMap[key]) return mockDetailMap[key];
  // fallback: synthesize from search list
  const base = mockSearchStocks.find((s) => s.symbol.toUpperCase() === key);
  if (base) {
    const changeValue = +(
      base.currentPrice *
      (base.changePercent / 100)
    ).toFixed(2);
    return {
      ...base,
      previousClose: +(base.currentPrice - changeValue).toFixed(2),
      changeValue,
      dayHigh: +(base.currentPrice * 1.006).toFixed(2),
      dayLow: +(base.currentPrice * 0.994).toFixed(2),
      dayOpen: +(base.currentPrice * 0.998).toFixed(2),
      volume: 1_000_000,
      marketCap: "10,000 Cr",
      peRatio: 20,
      week52High: +(base.currentPrice * 1.2).toFixed(2),
      week52Low: +(base.currentPrice * 0.8).toFixed(2),
    };
  }
  // final fallback if symbol unknown
  return mockDetailMap["RELIANCE"];
}
