/**
 * Utility to check if the market is currently open
 * Indian stock market hours: 9:15 AM - 3:30 PM IST on weekdays
 */

export interface MarketStatus {
  isOpen: boolean;
  label: string;
  nextEvent?: string; // e.g., "Opens at 9:15 AM" or "Closes at 3:30 PM"
}

/**
 * Check if the current time falls within market hours
 * Market: Monday-Friday, 9:15 AM - 3:30 PM IST
 */
export function getMarketStatus(): MarketStatus {
  // Get current time in IST (UTC+5:30)
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST offset in milliseconds
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const istTime = new Date(utcTime + istOffset);

  const day = istTime.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  // Market closed on weekends
  if (day === 0 || day === 6) {
    return {
      isOpen: false,
      label: "Closed",
      nextEvent: day === 6 ? "Opens Monday 9:15 AM" : "Opens Monday 9:15 AM",
    };
  }

  // Market hours: 9:15 AM (555 minutes) to 3:30 PM (930 minutes)
  const marketOpen = 9 * 60 + 15; // 9:15 AM
  const marketClose = 15 * 60 + 30; // 3:30 PM

  if (currentMinutes >= marketOpen && currentMinutes < marketClose) {
    return {
      isOpen: true,
      label: "Live",
      nextEvent: "Closes at 3:30 PM",
    };
  }

  // Before market opens
  if (currentMinutes < marketOpen) {
    return {
      isOpen: false,
      label: "Closed",
      nextEvent: "Opens at 9:15 AM",
    };
  }

  // After market closes
  return {
    isOpen: false,
    label: "Closed",
    nextEvent: day === 5 ? "Opens Monday 9:15 AM" : "Opens tomorrow 9:15 AM",
  };
}

/**
 * Hook to get live market status with auto-refresh
 * Updates every minute to keep status current
 */
export function useMarketStatus(): MarketStatus {
  const [status, setStatus] = React.useState<MarketStatus>(getMarketStatus());

  React.useEffect(() => {
    // Update status immediately
    setStatus(getMarketStatus());

    // Update every minute (60000ms)
    const interval = setInterval(() => {
      setStatus(getMarketStatus());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return status;
}

// For environments without React hooks (plain TS usage)
import * as React from "react";
