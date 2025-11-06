import styles from "./OrdersTab.module.css";
import type { Order } from "../../app/dashboard/types";
import { useEffect, useMemo, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { url } from '../../config.js';
import axios from 'axios';

type OrdersTabProps = {
  orders: Order[];
};

export function OrdersTab({ orders }: OrdersTabProps) {
  const [query, setQuery] = useState("");
  const [localOrders, setLocalOrders] = useState<Order[]>(orders || []);
  const [loading, setLoading] = useState(true);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");




  const fetchOrderDetails = async () => {
    console.log("Fetching order details");
    const token = localStorage.getItem("authToken");
    console.log("Token exists:", !!token);

    if (!token) {
      console.log("No token, redirecting");
      localStorage.removeItem("authToken");
      window.location.href = "/";
      return;
    }

    let user_id: number | undefined;

    try {
      const decode = jwtDecode(token) as any;
      console.log("Decoded token:", decode);
      user_id = decode?.sub?.user_id;
      console.log("User ID:", user_id);

      if (!user_id) {
        console.log("No user_id, redirecting");
        localStorage.removeItem("authToken");
        window.location.href = "/";
        return;
      }
    } catch (decodeError) {
      console.error("JWT decode error:", decodeError);
      localStorage.removeItem("authToken");
      window.location.href = "/";
      return;
    }

    // ✅ Only start loading & API request **after** user_id confirmed
    setLoading(true);
    try {
      console.log("Making API request to:", `${url}/fetch/api/orders`);
      console.log("Request body:", { user_id });

      const response = await axios.post(`${url}/fetch/api/orders`, { user_id });
      console.log("API Response:", response.data);

      const mappedOrders: Order[] = (response.data.orders || []).map((o: any) => ({
        name: o.stock_name,
        type: o.trade_type,
        qty: o.quantity,
        status: o.order_type,
        order_id: o.order_id,
        price: 0,
      }));

      console.log("Mapped orders:", mappedOrders);
      setLocalOrders(mappedOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("useEffect triggered, calling fetchOrderDetails");

    const token = localStorage.getItem("authToken");
    if (token) {
      fetchOrderDetails();
    }

    // 👉 Refetch when user comes back to this tab/page
    const handleFocus = () => {
      console.log("Window focused — refetching orders");
      fetchOrderDetails();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, []);



  console.log("Component rendered, localOrders:", localOrders);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = (localOrders || []).filter((o) => {
      const byStatus = o.status === "pending";
      const byQuery = !q || o.name.toLowerCase().includes(q);
      return byStatus && byQuery;
    });
    console.log("Filtered orders:", result);
    return result;
  }, [localOrders, query]);

  const handleConfirm = async (order: Order) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;
    setConfirming(order.order_id);
    try {
      let user_id: number | undefined;
      try {
        const decode = jwtDecode(token) as any;
        user_id = decode?.sub?.user_id;
      } catch (decodeError) {
        console.error("JWT decode error:", decodeError);
        return;
      }
      if (!user_id) return;

      console.log("Confirming order:", order.order_id);
      const requestBody = {
        stock_name: order.name,
        intended_price: order.price || 0,
        quantity: order.qty,
        trade_type: order.type,
        user_id: user_id,
        confirm_code: "proceedok",
        order_id: order.order_id   // ✅ ADD THIS LINE
      };
      console.log("Request body for re_submit:", requestBody);
      const response = await axios.post(`${url}/re_submit/order`, requestBody);
      console.log("Re-submit response:", response.data);

      if (response.data.status === "error") {
        setErrorMessage(response.data.message);
        setShowErrorPopup(true);
        setTimeout(() => {
          setShowErrorPopup(false);
          setErrorMessage("");
        }, 3000);
      } else {
        setShowConfirmPopup(true);
        setTimeout(() => setShowConfirmPopup(false), 3000);
        fetchOrderDetails();
      }
    } catch (error: any) {
      console.error('Confirm error:', error);
      const errorMsg = error.response?.data?.message || 'An error occurred during confirmation.';
      setErrorMessage(errorMsg);
      setShowErrorPopup(true);
      setTimeout(() => {
        setShowErrorPopup(false);
        setErrorMessage("");
      }, 3000);
    } finally {
      setConfirming(null);
    }
  };


  const handleRemove = async (order: Order) => {
    console.log("removing");
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setRemoving(order.order_id);
    try {
      console.log("Removing order:", order.order_id);
      await axios.delete(`${url}/order/delete`, {
        data: { order_id: order.order_id },
        headers: { "Content-Type": "application/json" }
      });

      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 3000);

      fetchOrderDetails();
    } catch (error) {
      console.error("Remove error:", error);
    } finally {
      setRemoving(null);
    }
  };


  if (loading) {
    console.log("Showing loading state");
    return (
      <section className={styles.ordersWrap}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Loading orders...
        </div>
      </section>
    );
  }


  return (
    <section className={styles.ordersWrap}>
      <header className={styles.headerRow}>
        <h2 className={styles.title}>Orders</h2>
        <div className={styles.actionsRow}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="11"
                cy="11"
                r="7"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
            <input
              className={styles.searchInput}
              placeholder="Search by symbol"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Desktop table */}
      <div className={styles.tableContainer}>
        {filtered.length ? (
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr className={styles.tr}>
                <th>Stock Name</th>
                <th>Trade Type</th>
                <th className={styles.tdRight}>Quantity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tbody}>
              {filtered.map((order, idx) => {
                const isBuy = order.type === "Buy";
                const isConfirmingThis = confirming === order.order_id;
                const isRemovingThis = removing === order.order_id;
                return (
                  <tr key={`${order.name}-t-${idx}`} className={styles.tr}>
                    <td>{order.name}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${isBuy ? styles.sideBuy : styles.sideSell
                          }`}
                      >
                        {order.type}
                      </span>
                    </td>
                    <td className={`${styles.tdRight} ${styles.mono}`}>
                      {order.qty}
                    </td>
                    <td>
                      <span className={styles.tableActions}>
                        <button
                          className={`${styles.actionBtn} ${styles.primaryBtn}`}
                          onClick={() => handleConfirm(order)}
                          disabled={isConfirmingThis}
                        >
                          {isConfirmingThis ? "Please wait..." : "Confirm"}
                        </button>
                        <button
                          className={`${styles.actionBtn} ${styles.dangerBtn}`}
                          onClick={() => handleRemove(order)}
                          disabled={isRemovingThis}
                        >
                          {isRemovingThis ? "Please wait..." : "Remove"}
                        </button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
              </svg>
            </div>
            <div className={styles.emptyTitle}>No orders</div>
            <div className={styles.emptyText}>
              Place a BUY or SELL order to see it here.
            </div>
          </div>
        )}
      </div>

      {/* Mobile cards */}
      <div className={styles.listWrap}>
        {filtered.length ? (
          filtered.map((order, idx) => {
            const isBuy = order.type === "Buy";
            const isConfirmingThis = confirming === order.order_id;
            const isRemovingThis = removing === order.order_id;
            return (
              <article key={`${order.name}-${idx}`} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.tickerBlock}>
                    <div
                      className={`${styles.sidePill} ${isBuy ? styles.buy : styles.sell
                        }`}
                    >
                      {order.type}
                    </div>
                    <div className={styles.tickerName}>{order.name}</div>
                  </div>
                  <div className={`${styles.statusPill} ${styles.statusPending}`}>
                    Pending
                  </div>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.metricCell}>
                    <div className={styles.metricLabel}>Quantity</div>
                    <div className={styles.metricValue}>{order.qty}</div>
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <>
                    <button
                      className={`${styles.actionBtn} ${styles.primaryBtn}`}
                      onClick={() => handleConfirm(order)}
                      disabled={isConfirmingThis}
                    >
                      {isConfirmingThis ? "Please wait..." : "Confirm"}
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.dangerBtn}`}
                      onClick={() => handleRemove(order)}
                      disabled={isRemovingThis}
                    >
                      {isRemovingThis ? "Please wait..." : "Remove"}
                    </button>
                  </>
                </div>
              </article>
            );
          })
        ) : (
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <rect x="4" y="3" width="16" height="18" rx="2" />
                <path d="M8 7h8M8 11h8M8 15h5" strokeLinecap="round" />
              </svg>
            </div>
            <div className={styles.emptyTitle}>No orders</div>
            <div className={styles.emptyText}>
              Place a BUY or SELL order to see it here.
            </div>
          </div>
        )}
      </div>

      {/* ✅ Success Popup Menu */}
      {showSuccessPopup && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Order has been removed
        </div>
      )}
      {showConfirmPopup && (
        <div
          style={{
            position: 'fixed',
            marginTop: '40px',
            top: '20px',
            right: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Order has been confirmed
        </div>
      )}
      {showErrorPopup && errorMessage && (
        <div
          style={{

            position: 'fixed',
            marginTop: '40px',
            top: '20px',
            right: '20px',
            backgroundColor: '#f44336',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
            maxWidth: '300px',
            wordWrap: 'break-word',
          }}
        >
          {errorMessage}
        </div>
      )}
    </section>
  );
}

function formatINR(n: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}