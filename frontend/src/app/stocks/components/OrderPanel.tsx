"use client";
import { useState } from "react";
import styles from "./OrderPanel.module.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { url } from "@/config";

type OrderPanelProps = {
  currentPrice: number;
};

export default function OrderPanel({ currentPrice }: OrderPanelProps) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(currentPrice);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [buysellBtn, setBuySellBtn] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pricechangedUI, setPriceChangedUI] = useState<boolean>(false);
  const [showPriceChangeModal, setShowPriceChangeModal] =
    useState<boolean>(false);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>("");

  const totalValue = quantity * price;

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

  const confirmBuy = async (confirmPrice: number) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to place an order.");
      return;
    }
    const decoded: any = jwtDecode(token);
    const user_id = decoded.sub.user_id;
    const stock_data = sessionStorage.getItem("currentStock");
    if (!stock_data) {
      alert("Please refresh the page.");
      return;
    }
    const stock = JSON.parse(stock_data);
    const obj = {
      stock_name: stock.companyName,
      intended_price: confirmPrice,
      user_id: user_id,
      quantity: quantity,
      trade_type: "Buy",
    };
    try {
      const response = await axios.post(`${url}/order/trade`, obj);
      console.log("Confirmed buy order response:", response.data);
      // Handle response status
      const status = response.data.status;
      if (status === "success" || status === "pending") { // UPDATED: Handle "pending" as success-like for market-closed cases
        setModalMessage(
          response.data.message ||
            (status === "pending" ? "Buy order queued as pending for market open!" : "Buy order placed successfully at the new price!")
        );
        setShowSuccessModal(true);
      } else if (status === "error") {
        setModalMessage(
          cleanErrorMessage(
            response.data.message || "Failed to place the confirmed buy order."
          )
        );
        setShowErrorModal(true);
      } else if (status === "price_changed") {
        setNewPrice(response.data.current_price || confirmPrice);
        setShowPriceChangeModal(true);
      } else if (status === "market_closed") { // KEPT: For potential future backend alignment
        setModalMessage(
          cleanErrorMessage(response.data.message || "Market is closed. Orders cannot be placed at this time.")
        );
        setShowErrorModal(true);
      } else { // Catch-all for unknown statuses
        console.warn("Unhandled API status:", status);
        setModalMessage("An unexpected response was received. Please try again.");
        setShowErrorModal(true);
      }
    } catch (error: any) {
      console.error("Error confirming buy order:", error);
      const errMsg =
        error.response?.data?.message ||
        "Failed to place the confirmed buy order. Please try again.";
      setModalMessage(cleanErrorMessage(errMsg));
      setShowErrorModal(true);
    }
  };

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
      } catch (error: any) {
        console.error("Error placing buy order:", error);
        const errMsg =
          error.response?.data?.message ||
          "Error placing buy order. Please try again.";
        setModalMessage(cleanErrorMessage(errMsg));
        setShowErrorModal(true);
        throw error; // Re-throw to handle in caller if needed
      } finally {
        console.log("Buy order process completed.");
      }
      // Check for response status
      if (!response) return; // Early return if no response (e.g., from catch)
      const status = response.data.status;
      if (status === "price_changed") {
        setNewPrice(response.data.current_price || finalPrice);
        setShowPriceChangeModal(true);
      } else if (status === "success" || status === "pending") { // UPDATED: Handle "pending" as success-like for market-closed cases
        setModalMessage(
          response.data.message || 
          (status === "pending" ? "Buy order queued as pending for market open!" : "Buy order placed successfully!")
        );
        setShowSuccessModal(true);
      } else if (status === "error") {
        setModalMessage(
          cleanErrorMessage(response.data.message || "Buy order failed.")
        );
        setShowErrorModal(true);
      } else if (status === "market_closed") { // KEPT: For potential future backend alignment
        setModalMessage(
          cleanErrorMessage(response.data.message || "Market is closed. Orders cannot be placed at this time.")
        );
        setShowErrorModal(true);
      } else { // Catch-all for unknown statuses
        console.warn("Unhandled API status:", status);
        setModalMessage("An unexpected response was received. Please try again.");
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
      } catch (error: any) {
        console.error("Error placing sell order:", error);
        const errMsg =
          error.response?.data?.message ||
          "Error placing sell order. Please try again.";
        setModalMessage(cleanErrorMessage(errMsg));
        setShowErrorModal(true);
      } finally {
        console.log("Sell order process completed.");
      }
      // Check for response status
      if (!response) return; // Early return if no response (e.g., from catch)
      const status = response.data.status;
      if (status === "price_changed") {
        setNewPrice(response.data.current_price || finalPrice);
        setShowPriceChangeModal(true);
      } else if (status === "success" || status === "pending") { // UPDATED: Handle "pending" as success-like for market-closed cases
        setModalMessage(
          response.data.message || 
          (status === "pending" ? "Sell order queued as pending for market open!" : "Sell order placed successfully!")
        );
        setShowSuccessModal(true);
      } else if (status === "error") {
        setModalMessage(
          cleanErrorMessage(response.data.message || "Sell order failed.")
        );
        setShowErrorModal(true);
      } else if (status === "market_closed") { // KEPT: For potential future backend alignment
        setModalMessage(
          cleanErrorMessage(response.data.message || "Market is closed. Orders cannot be placed at this time.")
        );
        setShowErrorModal(true);
      } else { // Catch-all for unknown statuses
        console.warn("Unhandled API status:", status);
        setModalMessage("An unexpected response was received. Please try again.");
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
    const decoded: any = jwtDecode(token);
    const user_id = decoded.sub.user_id;
    const finalPrice = orderType === "market" ? currentPrice : price;
    setIsLoading(true);
    try {
      if (activeTab === "buy") {
        console.log(`Buy order: ${quantity} shares @ ₹${finalPrice}`);
        await buyStock(finalPrice, user_id);
        return;
      } else {
        console.log(`Sell order: ${quantity} shares @ ₹${finalPrice}`);
        await sellStock(finalPrice, user_id);
        return;
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
          </label>
          <input
            type="number"
            step="0.05"
            value={orderType === "market" ? currentPrice : price}
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
            "Place Buy Order"
          ) : (
            "Place Sell Order"
          )}
        </button>
        {/* Info Note */}
        <p className={styles.infoNote}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          This is a paper trading platform. No real money is involved.
        </p>
      </div>
      {/* Price Change Confirmation Modal */}
      {showPriceChangeModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>⚠️</div>
            <h3 className={`${styles.modalTitle} ${styles.warning}`}>
              Price Changed
            </h3>
            <p className={styles.modalMessage}>The price has changed to</p>
            <div className={styles.priceHighlight}>
              ₹
              {newPrice.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className={styles.modalMessage}>
              Would you like to buy at this new price?
            </p>
            <div className={styles.modalButtons}>
              <button
                onClick={async () => {
                  setShowPriceChangeModal(false);
                  await confirmBuy(newPrice);
                }}
                className={`${styles.modalButton} ${styles.success}`}
              >
                Yes, Buy Now
              </button>
              <button
                onClick={() => setShowPriceChangeModal(false)}
                className={`${styles.modalButton} ${styles.secondary}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {showSuccessModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalIcon}>✅</div>
            <h3 className={`${styles.modalTitle} ${styles.success}`}>
              Success!
            </h3>
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