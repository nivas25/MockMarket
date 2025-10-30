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

  const [pricechangedUI,setPriceChangedUI] = useState<boolean>(false);
  const [showPriceChangeModal, setShowPriceChangeModal] = useState<boolean>(false);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<string>("");

  const totalValue = quantity * price;

  const cleanErrorMessage = (msg: string): string => {
    if (typeof msg !== 'string') return "An unexpected error occurred.";
    if (msg.startsWith("Database error: ")) {
      // Split by ':' and take the part after the code, trim any extra
      const parts = msg.split(':');
      if (parts.length >= 3) {
        return parts.slice(2).join(':').trim();
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
      trade_type: "Buy"
    };

    try {
      const response = await axios.post(`${url}/order/trade`, obj);
      console.log("Confirmed buy order response:", response.data);

      // Handle response status
      if (response.data.status === "success") {
        setModalMessage(response.data.message || "Buy order placed successfully at the new price!");
        setShowSuccessModal(true);
      } else if (response.data.status === "error") {
        setModalMessage(cleanErrorMessage(response.data.message || "Failed to place the confirmed buy order."));
        setShowErrorModal(true);
      } else if (response.data.status === "price_changed") {
        setNewPrice(response.data.current_price || confirmPrice);
        setShowPriceChangeModal(true);
      }
    } catch (error: any) {
      console.error("Error confirming buy order:", error);
      const errMsg = error.response?.data?.message || "Failed to place the confirmed buy order. Please try again.";
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
        trade_type: "Buy"
      }
      let response;
      try {
        response = await axios.post(`${url}/order/trade`, obj);
        console.log("Buy order response:", response.data);
      }
      catch (error: any) {
        console.error("Error placing buy order:", error);
        const errMsg = error.response?.data?.message || "Error placing buy order. Please try again.";
        setModalMessage(cleanErrorMessage(errMsg));
        setShowErrorModal(true);
        throw error; // Re-throw to handle in caller if needed
      }
      finally {
        console.log("Buy order process completed.");
      }

      // Check for response status
      if (response?.data?.status === "price_changed") {
        setNewPrice(response.data.current_price || finalPrice);
        setShowPriceChangeModal(true);
      } else if (response?.data?.status === "success") {
        setModalMessage(response.data.message || "Buy order placed successfully!");
        setShowSuccessModal(true);
      } else if (response?.data?.status === "error") {
        setModalMessage(cleanErrorMessage(response.data.message || "Buy order failed."));
        setShowErrorModal(true);
      }
    }
  }

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
        trade_type: "Sell"
      }
      let response;
      try {
        response = await axios.post(`${url}/order/trade`, obj);
        console.log("Sell order response:", response.data);
      }
      catch (error: any) {
        console.error("Error placing sell order:", error);
        const errMsg = error.response?.data?.message || "Error placing sell order. Please try again.";
        setModalMessage(cleanErrorMessage(errMsg));
        setShowErrorModal(true);
      }
      finally {
        
        console.log("Sell order process completed.");

      }

      // Check for response status
      if (response?.data?.status === "price_changed") {
        setNewPrice(response.data.current_price || finalPrice);
        setShowPriceChangeModal(true);
      } else if (response?.data?.status === "success") {
        setModalMessage(response.data.message || "Sell order placed successfully!");
        setShowSuccessModal(true);
      } else if (response?.data?.status === "error") {
        setModalMessage(cleanErrorMessage(response.data.message || "Sell order failed."));
        setShowErrorModal(true);
      }
    }

  }

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
    }
    finally {
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
            className={`${styles.tab} ${activeTab === "buy" ? styles.active : ""
              } ${styles.buyTab}`}
            onClick={() => setActiveTab("buy")}
          >
            Buy
          </button>
          <button
            className={`${styles.tab} ${activeTab === "sell" ? styles.active : ""
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
          className={`${styles.submitBtn} ${activeTab === "buy" ? styles.buyBtn : styles.sellBtn
            }`}
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className={styles.spinner} viewBox="0 0 24 24" width="16" height="16">
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
          ) : (
            activeTab === "buy" ? "Place Buy Order" : "Place Sell Order"
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
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '400px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ marginBottom: '10px' }}>Price Changed</h3>
            <p style={{ marginBottom: '20px' }}>
              The price has changed to ₹{newPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. 
              Would you like to buy at this price?
            </p>
            <button 
              onClick={async () => {
                setShowPriceChangeModal(false);
                await confirmBuy(newPrice);
              }}
              style={{
                marginRight: '10px',
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Yes
            </button>
            <button 
              onClick={() => setShowPriceChangeModal(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '400px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ marginBottom: '10px', color: '#4CAF50' }}>Success!</h3>
            <p style={{ marginBottom: '20px' }}>{modalMessage}</p>
            <button 
              onClick={closeModal}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              maxWidth: '400px',
              textAlign: 'center'
            }}
          >
            <h3 style={{ marginBottom: '10px', color: '#f44336' }}>Error</h3>
            <p style={{ marginBottom: '20px' }}>{modalMessage}</p>
            <button 
              onClick={closeModal}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}