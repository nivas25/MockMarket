'use client';

import { useEffect } from 'react';

type StockDetails = {
  symbol: string;
  companyName: string;
  currentPrice: number;
  changePercent: number;
  exchange: string;
  previousClose: number;
  changeValue: number;
  dayHigh: number;
  dayLow: number;
  dayOpen: number;
};

interface StockStorageProps {
  stock: StockDetails;
}

export default function StockStorage({ stock }: StockStorageProps) {
  useEffect(() => {
    if (!stock || !stock.symbol) return;

    const key = 'currentStock';
    sessionStorage.setItem(key, JSON.stringify(stock));
  }, [stock]);

  return null; // Invisible component; just handles side effects
}