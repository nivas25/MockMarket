"use client";

import { useState } from "react";
import styles from "./OrderPanel.module.css";

type OrderPanelProps = {
  currentPrice: number;
};

export default function OrderPanel({ currentPrice }: OrderPanelProps) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(currentPrice);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");

  const totalValue = quantity * price;

  const handleSubmit = () => {
    if (quantity <= 0) {
      alert("Please enter a valid quantity");
      return;
    }

    const finalPrice = orderType === "market" ? currentPrice : price;
    if (activeTab === "buy") {
      console.log(`Buy order: ${quantity} shares @ ₹${finalPrice}`);
    } else {
      console.log(`Sell order: ${quantity} shares @ ₹${finalPrice}`);
    }

    // Reset form
    setQuantity(1);
    setPrice(currentPrice);
  };

  return (
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
      <div className={styles.orderTypeSelector}>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            value="market"
            checked={orderType === "market"}
            onChange={(e) => setOrderType(e.target.value as "market")}
          />
          <span>Market Order</span>
        </label>
        <label className={styles.radioLabel}>
          <input
            type="radio"
            value="limit"
            checked={orderType === "limit"}
            onChange={(e) => setOrderType(e.target.value as "limit")}
          />
          <span>Limit Order</span>
        </label>
      </div>

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
          onChange={(e) => setPrice(parseFloat(e.target.value) || currentPrice)}
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
      >
        {activeTab === "buy" ? "Place Buy Order" : "Place Sell Order"}
      </button>

      {/* Info Note */}
      <p className={styles.infoNote}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        This is a paper trading platform. No real money is involved.
      </p>
    </div>
  );
}
