"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import styles from "./DashboardWidgets.module.css";
import type { Holding } from "../../app/dashboard/types";
import { HoldingDetailModal } from "./HoldingDetailModal";
import { jwtDecode } from "jwt-decode";

type HoldingsTabProps = {
  // No props needed now, fetches internally
};

type ApiHolding = {
  avg_buy_price: string;
  company_name: string;
  current_price: string;
  current_value: string;
  profit_loss: string;
  profit_loss_percent: string;
  stocks_quantity: number;
  symbol: string;
  total_invested: string;
  user_balance: string;
  // ... other fields
};

type ProcessedHolding = {
  name: string;
  qty: number;
  avg: number;
  ltp: number;
  prevClose: number;
  invested: number;
  value: number;
  pnlAbs: number;
  pnlPct: number;
  dayAbs: number;
  dayPct: number;
  allocation: number;
};

function parseNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const cleaned = value.replace(/[^0-9.\-]/g, "").replace(/(\.)(?=.*\.)/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
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

export function HoldingsTab() {
  const [processed, setProcessed] = useState<ProcessedHolding[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedHolding, setSelectedHolding] = useState<ProcessedHolding | null>(null);

  useEffect(() => {
    async function fetchHoldings() {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          console.error("No auth token found");
          return;
        }
        const decoded: any = jwtDecode(token);
        const userId = decoded.sub.user_id; // Assuming user_id is in the token payload

        const response = await axios.post("http://localhost:5000/holdings/portfolio", { user_id: userId });
        if (response.data.status === "success") {
          const apiHoldings: ApiHolding[] = response.data.holdings;
          if (apiHoldings.length > 0) {
            setBalance(parseNumber(apiHoldings[0].user_balance));
          }
          const rows = apiHoldings.map((h) => {
            const qty = h.stocks_quantity ?? 0;
            const avg = parseNumber(h.avg_buy_price);
            const ltp = parseNumber(h.current_price);
            const prevClose = ltp; // Assuming no prevClose, use current for 1D (will show 0%)
            const invested = parseNumber(h.total_invested);
            const value = parseNumber(h.current_value);
            const pnlAbs = parseNumber(h.profit_loss);
            const pnlPct = parseNumber(h.profit_loss_percent);
            const dayAbsPerShare = prevClose > 0 ? ltp - prevClose : 0;
            const dayPct = prevClose > 0 ? (dayAbsPerShare / prevClose) * 100 : 0;
            const dayAbs = dayAbsPerShare * qty;
            return {
              name: h.company_name,
              qty,
              avg,
              ltp,
              prevClose,
              invested,
              value,
              pnlAbs,
              pnlPct,
              dayAbs,
              dayPct,
            };
          });
          const totalValue = rows.reduce((s, r) => s + r.value, 0);
          const withAlloc = rows.map((r) => ({
            ...r,
            allocation: totalValue > 0 ? (r.value / totalValue) * 100 : 0,
          }));
          setProcessed(withAlloc);
        }
      } catch (error) {
        console.error("Error fetching holdings:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchHoldings();
  }, []);

  const invested = processed.reduce((s, r) => s + r.invested, 0);
  const value = processed.reduce((s, r) => s + r.value, 0);
  const pnlAbs = processed.reduce((s, r) => s + r.pnlAbs, 0);
  const pnlPct = invested > 0 ? (pnlAbs / invested) * 100 : 0;
  const dayAbs = processed.reduce((s, r) => s + r.dayAbs, 0);
  const dayPct = value > 0 ? (dayAbs / value) * 100 : 0;
  const totals = { invested, value, pnlAbs, pnlPct, dayAbs, dayPct };

  const filtered = processed; // No search/sort for simplicity, as logics removed except return

  function exportCsv() {
    const header = [
      "Name",
      "Qty",
      "Avg",
      "LTP",
      "Invested",
      "Value",
      "P&L",
      "P&L%",
      "Allocation%",
    ];
    const lines = filtered.map((r) => [
      r.name,
      r.qty,
      r.avg.toFixed(2),
      r.ltp.toFixed(2),
      r.invested.toFixed(2),
      r.value.toFixed(2),
      r.pnlAbs.toFixed(2),
      r.pnlPct.toFixed(2),
      r.allocation.toFixed(2),
    ]);
    const csv = [header, ...lines].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "holdings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const pnlPositive = totals.pnlAbs >= 0;

  if (loading) {
    return <div className={styles.widget} style={{ gridColumn: "1 / -1" }}>Loading...</div>;
  }

  return (
    <div
      className={`${styles.widget} ${styles.holdingsWidget}`}
      style={{ gridColumn: "1 / -1" }}
    >
      <div className={styles.widgetHeader}>
        <h2 className={styles.widgetTitle}>Holdings ({processed.length})</h2>
      </div>

      {/* Balance Section */}
      <div className={styles.balanceSection}>
        <div className={styles.balanceInfo}>
          <div className={styles.balanceLabel}>Balance</div>
          <div className={styles.balanceAmount}>₹{formatINR(balance)}</div>
        </div>
        <div className={styles.balanceInfo}>
          <div className={styles.balanceLabel}>Total portfolio value</div>
          <div className={styles.balanceAmount}>₹{formatINR(totals.value)}</div>
        </div>
      </div>

      {/* Summary panel */}
      <div className={styles.holdingsSummaryPanel}>
        <div className={styles.hSummaryBlock}>
          <div className={styles.mutedLabel}>Current value</div>
          <div className={styles.bigValue}>₹{formatINR(totals.value)}</div>
        </div>
        <div className={styles.hSummaryBlock}>
          <div className={styles.mutedLabel}>Invested value</div>
          <div className={styles.bigValue}>₹{formatINR(totals.invested)}</div>
        </div>
        <div className={styles.hSummaryRight}>
          <div className={styles.returnsRow}>
            {/* <div className={styles.returnLabel}>1D returns</div>
            <div
              className={
                totals.dayAbs >= 0
                  ? styles.returnPositive
                  : styles.returnNegative
              }
            >
              {totals.dayAbs >= 0 ? "+" : "-"}₹
              {formatINR(Math.abs(totals.dayAbs))}
              <span className={styles.returnPct}>
                ({totals.dayAbs >= 0 ? "+" : "-"}
                {Math.abs(totals.dayPct).toFixed(2)}%)
              </span>
            </div> */}
          </div>
          <div className={styles.returnsRow}>
            <div className={styles.returnLabel}>Total returns</div>
            <div
              className={
                pnlPositive ? styles.returnPositive : styles.returnNegative
              }
            >
              {pnlPositive ? "+" : "-"}₹{formatINR(Math.abs(totals.pnlAbs))}
              <span className={styles.returnPct}>
                ({totals.pnlPct >= 0 ? "+" : "-"}
                {Math.abs(totals.pnlPct).toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.holdingsControls}>
        <input
          className={styles.holdingsSearch}
          placeholder="Search holdings"
          // value={query}
          // onChange={(e) => setQuery(e.target.value)}
          disabled
        />
        <div className={styles.holdingsActions}>
          <button
            className={styles.sortButton}
            // onClick={() => toggleSort("pnlPct")}
            disabled
            aria-label="Sort by P&L%"
          >
            P&L%
          </button>
          <button
            className={styles.sortButton}
            // onClick={() => toggleSort("value")}
            disabled
            aria-label="Sort by Value"
          >
            Value
          </button>
          <button className={styles.exportButton} onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.placeholderText}>No holdings to display.</p>
      ) : (
        <div
          className={styles.holdingsTable}
          role="table"
          aria-label="Holdings"
        >
          <div className={`${styles.hRow} ${styles.hHeader}`} role="row">
            <div className={styles.hCell} role="columnheader">
              Company
            </div>
            <div
              className={`${styles.hCell} ${styles.hNum}`}
              role="columnheader"
            >
              Market price (1D%)
            </div>
            <div
              className={`${styles.hCell} ${styles.hNum}`}
              role="columnheader"
            >
              Returns (%)
            </div>
            <div
              className={`${styles.hCell} ${styles.hNum}`}
              role="columnheader"
            >
              Current (Invested)
            </div>
          </div>

          {filtered.map((r) => {
            const pos = r.pnlAbs >= 0;
            const dayPos = r.dayAbs >= 0;
            return (
              <div
                key={r.name}
                className={`${styles.hRow} ${styles.clickableRow}`}
                role="row"
                onClick={() => setSelectedHolding(r)}
              >
                <div className={styles.hCell} role="cell">
                  <div className={styles.stockName}>{r.name}</div>
                  <div className={styles.stockSubtext}>
                    {r.qty} share{r.qty !== 1 ? "s" : ""} • Avg. ₹
                    {formatINR(r.avg)}
                  </div>
                </div>
                <div className={`${styles.hCell} ${styles.hNum}`} role="cell">
                  ₹{formatINR(r.ltp)}
                  <div
                    className={`${styles.hSub} ${
                      dayPos ? styles.pTextPositive : styles.pTextNegative
                    }`}
                  >
                    {dayPos ? "+" : "-"}₹{formatINR(Math.abs(r.dayAbs))} (
                    {dayPos ? "+" : "-"}
                    {Math.abs(r.dayPct).toFixed(2)}%)
                  </div>
                </div>
                <div className={`${styles.hCell} ${styles.hNum}`} role="cell">
                  <div
                    className={
                      pos ? styles.pTextPositive : styles.pTextNegative
                    }
                  >
                    {pos ? "+" : "-"}₹{formatINR(Math.abs(r.pnlAbs))}
                  </div>
                  <div
                    className={`${styles.hSub} ${
                      pos ? styles.pTextPositive : styles.pTextNegative
                    }`}
                  >
                    {pos ? "+" : "-"}
                    {Math.abs(r.pnlPct).toFixed(2)}%
                  </div>
                </div>
                <div className={`${styles.hCell} ${styles.hNum}`} role="cell">
                  ₹{formatINR(r.value)}
                  <div className={styles.hSub}>₹{formatINR(r.invested)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedHolding && (
        <HoldingDetailModal
          isOpen={true}
          onClose={() => setSelectedHolding(null)}
          holding={{
            name: selectedHolding.name,
            ltp: selectedHolding.ltp,
            qty: selectedHolding.qty,
            avg: selectedHolding.avg,
            dayChange: selectedHolding.dayAbs,
            dayChangePct: selectedHolding.dayPct,
          }}
        />
      )}
    </div>
  );
}