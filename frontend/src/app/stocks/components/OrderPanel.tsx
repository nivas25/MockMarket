"use client";
import { useState, useEffect, useMemo } from "react";
import styles from "./OrderPanel.module.css";
import axios, { AxiosError } from "axios";
import { jwtDecode } from "jwt-decode";
import { url } from "@/config";

import { useRealtimePrices } from "@/hooks/useRealtimePrices";
import { getMarketStatus } from "@/utils/marketHours";

type OrderPanelProps = {
  currentPrice: number; // initial snapshot price from server render
  symbol: string; // stock symbol for live subscription
  priceSource?: string;
  timestamp?: string;
};

export default function OrderPanel({
  currentPrice,
  symbol,
  priceSource,
}: OrderPanelProps) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(currentPrice);
  const [orderType] = useState<"market" | "limit">("market");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>("");
  // Price-confirm flow states
  const [showPriceConfirmModal, setShowPriceConfirmModal] =
    useState<boolean>(false);
  const [priceConfirmMessage, setPriceConfirmMessage] = useState<string>("");
  const [preflightInProgress, setPreflightInProgress] =
    useState<boolean>(false);
  const [preflightPrice, setPreflightPrice] = useState<number | null>(null);

  // Live price subscription
  const symbolsArr = useMemo(() => [symbol], [symbol]);
  const livePrices = useRealtimePrices(symbolsArr);
  const liveLtp = livePrices[symbol?.toUpperCase()]?.ltp;

  // Determine if we have a fresh live price
  const hasLivePrice = typeof liveLtp === "number";
  const resolvedMarketPrice = hasLivePrice ? liveLtp : currentPrice;

  // Badge logic - must match StockHeader exactly
  const badge = useMemo(() => {
    if (hasLivePrice) return { label: "LIVE", kind: "live" as const };
    const src = (priceSource || "").toLowerCase();
    if (src === "websocket_cache" || src === "upstox_api")
      return { label: "LIVE", kind: "live" as const };
    return { label: "CACHED", kind: "cached" as const };
  }, [hasLivePrice, priceSource]);

  // Debug logging
  useEffect(() => {
    console.log(
      `[OrderPanel] ${symbol} - hasLive: ${hasLivePrice}, priceSource: ${priceSource}, badge: ${
        badge.kind
      }, resolvedPrice: ${resolvedMarketPrice.toFixed(2)}`
    );
  }, [symbol, hasLivePrice, priceSource, badge.kind, resolvedMarketPrice]);

  // Use live price for market orders; retain manual input for limit orders
  const effectivePrice = orderType === "market" ? resolvedMarketPrice : price;
  const totalValue = quantity * effectivePrice;

  // Keep internal price state in sync when in market mode (so price field reflects live)
  useEffect(() => {
    if (orderType === "market" && hasLivePrice) {
      setPrice(liveLtp);
    } else if (orderType === "market" && !hasLivePrice) {
      setPrice(currentPrice);
    }
  }, [liveLtp, orderType, hasLivePrice, currentPrice]);

  const cleanErrorMessage = (msg: string): string => {
    if (typeof msg !== "string") return "An unexpected error occurred.";
    if (msg.startsWith("Database error: ")) {
      // Split by ':' and take the part after the code, trim any extra
      const parts = msg.split(":");
      if (parts.length >= 3) {
        return parts.slice(2).join(":").trim();
      }
    }
    return msg;
  };

  const closeModal = () => {
    setShowSuccessModal(false);
    setShowErrorModal(false);
    setModalMessage("");
  };

  // confirmBuy removed as server no longer returns price_changed

  interface TradeResponse {
    status: "success" | "pending" | "error";
    message?: string;
    executed_price?: number;
  }
  interface JwtPayloadShape {
    sub: { user_id: number };
    // Allow other unknown claims with an index signature using unknown type
    [key: string]: unknown;
  }

  const buyStock = async (finalPrice: number, user_id: number) => {
    const stock_data = sessionStorage.getItem("currentStock");
    console.log("Stock data from sessionStorage: of buying", stock_data);
    if (stock_data) {
      const stock = JSON.parse(stock_data);
      const obj = {
        stock_name: stock.companyName,
        intended_price: finalPrice,
        user_id: user_id,
        quantity: quantity,
        trade_type: "Buy",
      };
      let response;
      try {
        response = await axios.post(`${url}/order/trade`, obj);
        console.log("Buy order response:", response.data);
      } catch (err) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        console.error("Error placing buy order:", axiosErr);
        const errMsg =
          axiosErr.response?.data?.message ||
          "Error placing buy order. Please try again.";
        setModalMessage(cleanErrorMessage(errMsg));
        setShowErrorModal(true);
        throw err; // Re-throw to handle in caller if needed
      } finally {
        console.log("Buy order process completed.");
      }
      // Check for response status
      if (!response) return; // Early return if no response (e.g., from catch)
      const tradeResp = response.data as TradeResponse;
      const status = tradeResp.status;
      if (status === "success" || status === "pending") {
        let executedText = "";
        if (
          status === "success" &&
          typeof tradeResp.executed_price === "number"
        ) {
          const executedPrice = tradeResp.executed_price;
          const intendedPrice = finalPrice;
          const priceDiff = Math.abs(executedPrice - intendedPrice);

          // Show price comparison if there's a notable difference
          if (priceDiff > 0.5) {
            executedText = ` Trade executed at ₹${executedPrice.toFixed(
              2
            )} (live market price). You expected ₹${intendedPrice.toFixed(2)}.`;
          } else {
            executedText = ` Executed at ₹${executedPrice.toFixed(2)}.`;
          }
        }
        setModalMessage(
          tradeResp.message ||
            (status === "pending"
              ? `Buy order queued as pending for market open!${executedText}`
              : `Buy order placed successfully!${executedText}`)
        );
        setShowSuccessModal(true);
      } else if (status === "error") {
        setModalMessage(
          cleanErrorMessage(response.data.message || "Buy order failed.")
        );
        setShowErrorModal(true);
      } else {
        // Unhandled status - log and show generic error
        console.error("Unexpected API status:", status, response.data);
        setModalMessage(
          cleanErrorMessage(
            response.data.message ||
              "An unexpected error occurred. Please try again."
          )
        );
        setShowErrorModal(true);
      }
    }
  };

  const sellStock = async (finalPrice: number, user_id: number) => {
    const stock_data = sessionStorage.getItem("currentStock");
    console.log("Stock data from sessionStorage: of selling", stock_data);
    if (stock_data) {
      const stock = JSON.parse(stock_data);
      const obj = {
        stock_name: stock.companyName,
        intended_price: finalPrice,
        user_id: user_id,
        quantity: quantity,
        trade_type: "Sell",
      };
      let response;
      try {
        response = await axios.post(`${url}/order/trade`, obj);
        console.log("Sell order response:", response.data);
      } catch (err) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        console.error("Error placing sell order:", axiosErr);
        const errMsg =
          axiosErr.response?.data?.message ||
          "Error placing sell order. Please try again.";
        setModalMessage(cleanErrorMessage(errMsg));
        setShowErrorModal(true);
      } finally {
        console.log("Sell order process completed.");
      }
      // Check for response status
      if (!response) return; // Early return if no response (e.g., from catch)
      const tradeResp = response.data as TradeResponse;
      const status = tradeResp.status;
      if (status === "success" || status === "pending") {
        let executedText = "";
        if (
          status === "success" &&
          typeof tradeResp.executed_price === "number"
        ) {
          const executedPrice = tradeResp.executed_price;
          const intendedPrice = finalPrice;
          const priceDiff = Math.abs(executedPrice - intendedPrice);

          // Show price comparison if there's a notable difference
          if (priceDiff > 0.5) {
            executedText = ` Trade executed at ₹${executedPrice.toFixed(
              2
            )} (live market price). You expected ₹${intendedPrice.toFixed(2)}.`;
          } else {
            executedText = ` Executed at ₹${executedPrice.toFixed(2)}.`;
          }
        }
        setModalMessage(
          tradeResp.message ||
            (status === "pending"
              ? `Sell order queued as pending for market open!${executedText}`
              : `Sell order placed successfully!${executedText}`)
        );
        setShowSuccessModal(true);
      } else if (status === "error") {
        setModalMessage(
          cleanErrorMessage(response.data.message || "Sell order failed.")
        );
        setShowErrorModal(true);
      } else {
        // Unhandled status - log and show generic error
        console.error("Unexpected API status:", status, response.data);
        setModalMessage(
          cleanErrorMessage(
            response.data.message ||
              "An unexpected error occurred. Please try again."
          )
        );
        setShowErrorModal(true);
      }
    }
  };

  const handleSubmit = async () => {
    console.log("Submitting order...");
    if (quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    const stock_data = sessionStorage.getItem("currentStock");
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to place an order.");
      window.location.href = "/";
      return;
    }
    if (!stock_data) {
      alert("Please refresh the page.");
      window.location.href = "/dashboard";
      return;
    }
    const decoded = jwtDecode<JwtPayloadShape>(token);
    const user_id = decoded.sub.user_id;
    const finalPrice = effectivePrice;
    // Preflight logic: during market hours prefer live websocket/API price
    const marketStatus = getMarketStatus();
    setIsLoading(true);
    try {
      let livePrice: number | undefined = undefined;

      if (marketStatus.isOpen) {
        // Prefer websocket live price if available
        if (typeof liveLtp === "number") {
          livePrice = liveLtp;
        } else {
          // No websocket price yet - request a force-live snapshot from backend
          try {
            setPreflightInProgress(true);
            const resp = await axios.get(
              `${url}/stocks/detail/${symbol}?forceLive=1`
            );
            if (resp?.data && resp.data.status === "success") {
              const data = resp.data.data;
              if (data && typeof data.currentPrice === "number") {
                livePrice = data.currentPrice;
                // update local price shown to user
                setPrice(data.currentPrice);
              }
            }
          } catch (e) {
            console.warn("Preflight forceLive failed:", e);
          } finally {
            setPreflightInProgress(false);
          }
        }

        // If we couldn't obtain a live price, abort an open-market trade to avoid surprises
        if (typeof livePrice !== "number") {
          setModalMessage(
            "Unable to obtain a fresh live price. Please wait a moment and try again."
          );
          setShowErrorModal(true);
          return;
        }

        // Compare livePrice vs UI's effectivePrice and show confirmation if moved
        const ABS_THRESHOLD = 2.0; // ₹2 absolute
        const PCT_THRESHOLD = 0.005; // 0.5% relative
        const priceDiff = Math.abs(livePrice - finalPrice);
        const priceDiffPct = finalPrice > 0 ? priceDiff / finalPrice : 0;

        if (priceDiff >= ABS_THRESHOLD || priceDiffPct >= PCT_THRESHOLD) {
          // Show confirm modal with preflightPrice set
          setPreflightPrice(livePrice);
          setPriceConfirmMessage(
            `Live price has changed from ₹${finalPrice.toFixed(
              2
            )} to ₹${livePrice.toFixed(
              2
            )}. Do you want to proceed at the live price?`
          );
          setShowPriceConfirmModal(true);
          return;
        }

        // No significant change — proceed using livePrice
        if (activeTab === "buy") {
          console.log(`Buy order (preflight) @ ₹${livePrice}`);
          await buyStock(livePrice, user_id);
          return;
        } else {
          console.log(`Sell order (preflight) @ ₹${livePrice}`);
          await sellStock(livePrice, user_id);
          return;
        }
      } else {
        // Market closed: proceed as before with effectivePrice
        if (activeTab === "buy") {
          console.log(`Buy order: ${quantity} shares @ ₹${finalPrice}`);
          await buyStock(finalPrice, user_id);
          return;
        } else {
          console.log(`Sell order: ${quantity} shares @ ₹${finalPrice}`);
          await sellStock(finalPrice, user_id);
          return;
        }
      }
    } finally {
      setIsLoading(false);
    }
    // Reset form
    setQuantity(1);
    setPrice(currentPrice);
  };

  return (
    <>
      <div className={styles.orderPanel}>
        {/* Tab Switcher */}
        <div className={styles.tabSwitcher}>
          <button
            className={`${styles.tab} ${
              activeTab === "buy" ? styles.active : ""
            } ${styles.buyTab}`}
            onClick={() => setActiveTab("buy")}
          >
            Buy
          </button>
          <button
            className={`${styles.tab} ${
              activeTab === "sell" ? styles.active : ""
            } ${styles.sellTab}`}
            onClick={() => setActiveTab("sell")}
          >
            Sell
          </button>
        </div>
        {/* Order Type Selector */}

        {/* Form Fields */}
        <div className={styles.formGroup}>
          <label className={styles.label}>Quantity</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, parseInt(e.target.value) || 1))
            }
            className={styles.input}
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Price {orderType === "market" && "(at market)"}
            {orderType === "market" && badge.kind === "live" && (
              <span
                className={styles.liveBadge}
                title={
                  priceSource ? `source: ${priceSource}` : "Live market price"
                }
              >
                🟢 LIVE
              </span>
            )}
            {orderType === "market" && badge.kind === "cached" && (
              <span
                className={styles.staleBadge}
                title={
                  priceSource
                    ? `source: ${priceSource}`
                    : "Using cached price - live price unavailable"
                }
              >
                ⚠️ CACHED
              </span>
            )}
          </label>
          <input
            type="number"
            step="0.05"
            value={
              orderType === "market" ? resolvedMarketPrice.toFixed(2) : price
            }
            onChange={(e) =>
              setPrice(parseFloat(e.target.value) || currentPrice)
            }
            className={styles.input}
            disabled={orderType === "market"}
          />
        </div>
        {/* Total Value */}
        <div className={styles.totalSection}>
          <span className={styles.totalLabel}>Total Value</span>
          <span className={styles.totalValue}>
            ₹
            {totalValue.toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        {/* Submit Button */}
        <button
          className={`${styles.submitBtn} ${
            activeTab === "buy" ? styles.buyBtn : styles.sellBtn
          }`}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg
                className={styles.spinner}
                viewBox="0 0 24 24"
                width="16"
                height="16"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  pathLength="1"
                  className={styles.spinnerCircle}
                />
              </svg>
              Placing Order...
            </>
          ) : activeTab === "buy" ? (
            `Place Buy Order @ ₹${effectivePrice.toFixed(2)}`
          ) : (
            `Place Sell Order @ ₹${effectivePrice.toFixed(2)}`
          )}
        </button>
        {/* Info Note */}
        <p className={styles.infoNote}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          {badge.kind === "live"
            ? "✓ Trading at real-time market price. Trades execute at the live price from our data feed."
            : "⚠️ Using cached price. Live price feed currently unavailable. Trade will execute at actual market price when placed."}
        </p>
        {badge.kind === "cached" && (
          <p className={styles.warningNote}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            Note: The displayed price may differ from the execution price. The
            backend always uses the latest live price for trades.
          </p>
        )}
      </div>
      {/* Price Change Confirmation Modal */}
      {/* Price change modal removed */}
      {/* Success Modal with Confetti */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.confettiContainer}>
            {/* Generate confetti pieces */}
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className={styles.confetti}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                  backgroundColor: [
                    "#FFD700",
                    "#FFA500",
                    "#FF6B6B",
                    "#4ECDC4",
                    "#45B7D1",
                    "#96CEB4",
                    "#FFEAA7",
                    "#DFE6E9",
                  ][Math.floor(Math.random() * 8)],
                }}
              />
            ))}
          </div>
          <div className={styles.modalContent}>
            <div className={styles.celebrationIcon}>🎉</div>
            <p className={styles.modalMessage}>{modalMessage}</p>
            <div className={styles.modalButtons}>
              <button
                onClick={closeModal}
                className={`${styles.modalButton} ${styles.success}`}
              >
                Awesome!
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Price Confirm Modal (when live price moved) */}
      {showPriceConfirmModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Price changed</h3>
            <p className={styles.modalMessage}>{priceConfirmMessage}</p>
            <div className={styles.modalButtons}>
              <button
                onClick={async () => {
                  // Confirm: proceed with preflightPrice
                  setShowPriceConfirmModal(false);
                  if (!preflightPrice) {
                    setModalMessage(
                      "Unable to retrieve live price. Please try again."
                    );
                    setShowErrorModal(true);
                    return;
                  }
                  const token = localStorage.getItem("authToken");
                  if (!token) {
                    alert("You must be logged in to place an order.");
                    window.location.href = "/";
                    return;
                  }
                  const decoded = jwtDecode<JwtPayloadShape>(token);
                  const user_id = decoded.sub.user_id;
                  setIsLoading(true);
                  try {
                    if (activeTab === "buy") {
                      await buyStock(preflightPrice, user_id);
                    } else {
                      await sellStock(preflightPrice, user_id);
                    }
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className={`${styles.modalButton} ${styles.success}`}
              >
                Proceed at live price
              </button>
              <button
                onClick={() => setShowPriceConfirmModal(false)}
                className={`${styles.modalButton} ${styles.error}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Error Modal */}
      {showErrorModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>❌</div>
            <h3 className={`${styles.modalTitle} ${styles.error}`}>Error</h3>
            <p className={styles.modalMessage}>{modalMessage}</p>
            <div className={styles.modalButtons}>
              <button
                onClick={closeModal}
                className={`${styles.modalButton} ${styles.error}`}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
