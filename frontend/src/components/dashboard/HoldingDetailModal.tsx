"use client";

import { useMemo, useState } from "react";
import { useTheme } from "../contexts/ThemeProvider";
import styles from "./HoldingDetailModal.module.css";

type HoldingBrief = {
  name: string;
  ltp: number; // last traded price
  qty: number;
  avg: number; // average buy price
  dayChange: number; // absolute change today for total qty
  dayChangePct: number; // percent change today
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  holding: HoldingBrief;
  theme?: "auto" | "light" | "dark"; // optional theme override
};

export function HoldingDetailModal({
  isOpen,
  onClose,
  holding,
  theme = "auto",
}: Props) {
  // Prefer app theme from ThemeProvider when theme="auto"
  const themeContext = useTheme();
  const resolvedTheme = useMemo<"light" | "dark">(() => {
    if (theme === "light" || theme === "dark") return theme;
    const ctx = themeContext?.theme?.toLowerCase?.();
    return ctx === "dark" ? "dark" : "light";
  }, [theme, themeContext?.theme]);
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [qty, setQty] = useState<number>(
    Math.max(1, Math.min(holding.qty || 1, 999999))
  );
  const [limitPrice, setLimitPrice] = useState<number>(holding.ltp);

  const invested = useMemo(() => holding.avg * holding.qty, [holding]);
  const currentValue = useMemo(() => holding.ltp * holding.qty, [holding]);
  const pnlAbs = useMemo(
    () => currentValue - invested,
    [currentValue, invested]
  );
  const pnlPct = useMemo(
    () => (invested > 0 ? (pnlAbs / invested) * 100 : 0),
    [invested, pnlAbs]
  );
  const pos = pnlAbs >= 0;

  const execPrice = orderType === "MARKET" ? holding.ltp : limitPrice;
  const estTotal = Math.max(0, execPrice * qty);

  function onOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  const themeClass =
    resolvedTheme === "dark" ? styles.themeDark : styles.themeLight;

  return isOpen ? (
    <div className={styles.modalOverlay} onClick={onOverlayClick}>
      <div
        className={`${styles.modalContent} ${themeClass}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${holding.name} trade`}
      >
        <div className={styles.header}>
          <div className={styles.title}>
            <div className={styles.name}>{holding.name}</div>
            <div className={styles.priceRow}>
              <div className={styles.ltp}>₹{formatINR(holding.ltp)}</div>
              <div
                className={`${styles.priceChange} ${
                  holding.dayChange >= 0 ? styles.profit : styles.loss
                }`}
              >
                {holding.dayChange >= 0 ? "+" : "-"}₹
                {formatINR(Math.abs(holding.dayChange))} (
                {holding.dayChangePct >= 0 ? "+" : "-"}
                {Math.abs(holding.dayChangePct).toFixed(2)}%)
              </div>
            </div>
          </div>
          <button
            className={styles.closeBtn}
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          {/* Performance Capsule */}
          {(() => {
            const gauge = Math.min(100, Math.abs(pnlPct));
            const ringStyle = {
              "--g": gauge as unknown as string,
              "--gcolor": (pos ? "#00b386" : "#d61f1f") as string,
            } as React.CSSProperties & { [key: string]: string | number };
            const gain = pnlAbs;
            const denom = invested + Math.abs(gain) || 1;
            const investedPct = Math.max(
              5,
              Math.min(95, (invested / denom) * 100)
            );
            const variationPct = Math.min(95, (Math.abs(gain) / denom) * 100);

            return (
              <div className={styles.capsule}>
                <div className={styles.tickerRow}>
                  <div className={styles.ticker}>{holding.name}</div>
                  <div
                    className={`${styles.trendPill} ${
                      pos ? styles.up : styles.down
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      {pos ? (
                        <path
                          d="M5 15l7-7 7 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : (
                        <path
                          d="M5 9l7 7 7-7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                    <span>
                      {pos ? "+" : "-"}
                      {Math.abs(pnlPct).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className={styles.capsuleGrid}>
                  <div className={styles.gaugeWrap}>
                    <div className={styles.gaugeRing} style={ringStyle}>
                      <div className={styles.gaugeCenter}>
                        <div className={styles.gaugeValue}>
                          {pos ? "+" : "-"}₹{formatINR(Math.abs(pnlAbs))}
                        </div>
                        <div className={styles.gaugeLabel}>Total P&L</div>
                      </div>
                    </div>
                  </div>
                  <div className={styles.metricsCol}>
                    <div className={styles.metricItem}>
                      <div className={styles.metricLabel}>Invested</div>
                      <div className={styles.metricValue}>
                        ₹{formatINR(invested)}
                      </div>
                    </div>
                    <div className={styles.metricItem}>
                      <div className={styles.metricLabel}>Current value</div>
                      <div className={styles.metricValue}>
                        ₹{formatINR(currentValue)}
                      </div>
                    </div>
                    <div className={styles.metricItem}>
                      <div className={styles.metricLabel}>Break-even</div>
                      <div className={styles.metricValue}>
                        ₹{formatINR(holding.avg)}
                      </div>
                    </div>
                    <div className={styles.metricItem}>
                      <div className={styles.metricLabel}>Quantity</div>
                      <div className={styles.metricValue}>{holding.qty}</div>
                    </div>
                  </div>
                </div>

                <div className={styles.valueBarWrap}>
                  <div className={styles.valueBarTitle}>Value composition</div>
                  <div className={styles.valueBar}>
                    <div
                      className={styles.investedSeg}
                      style={{ width: `${investedPct}%` }}
                    />
                    {gain >= 0 ? (
                      <div
                        className={styles.gainSeg}
                        style={{ width: `${variationPct}%` }}
                      />
                    ) : (
                      <div
                        className={styles.lossSeg}
                        style={{ width: `${variationPct}%` }}
                      />
                    )}
                  </div>
                  <div className={styles.valueLegend}>
                    <div className={styles.legendItem}>
                      <span
                        className={styles.dot}
                        style={{
                          background:
                            "linear-gradient(90deg, rgba(212, 175, 55, 0.6), rgba(212, 175, 55, 0.35))",
                        }}
                      />
                      <span>Invested ₹{formatINR(invested)}</span>
                    </div>
                    <div className={styles.legendItem}>
                      <span
                        className={styles.dot}
                        style={{
                          background: pos
                            ? "linear-gradient(90deg, rgba(0, 179, 134, 0.8), rgba(0, 179, 134, 0.5))"
                            : "linear-gradient(90deg, rgba(214, 31, 31, 0.8), rgba(214, 31, 31, 0.5))",
                        }}
                      />
                      <span>
                        {pos ? "Gain" : "Loss"} ₹{formatINR(Math.abs(gain))}
                      </span>
                    </div>
                  </div>
                  <div className={styles.insightsRow}>
                    {(() => {
                      const perShare = holding.ltp - holding.avg;
                      const toBreakEvenPerShare = Math.max(
                        0,
                        holding.avg - holding.ltp
                      );
                      const toBreakEvenTotal =
                        toBreakEvenPerShare * holding.qty;
                      const delta1pct = holding.ltp * 0.01 * holding.qty;
                      const deltaNeg1pct = -delta1pct;
                      return (
                        <>
                          <div
                            className={`${styles.chip} ${
                              perShare >= 0 ? styles.chipUp : styles.chipDown
                            }`}
                          >
                            <span
                              className={styles.chipIcon}
                              aria-hidden="true"
                            >
                              {perShare >= 0 ? (
                                <svg
                                  viewBox="0 0 24 24"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path
                                    d="M5 15l7-7 7 7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  viewBox="0 0 24 24"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path
                                    d="M5 9l7 7 7-7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                            Per-share P&L: {perShare >= 0 ? "+" : "-"}₹
                            {formatINR(Math.abs(perShare))}
                          </div>
                          {toBreakEvenTotal > 0 && (
                            <div
                              className={`${styles.chip} ${styles.chipNeutral}`}
                            >
                              <span
                                className={styles.chipIcon}
                                aria-hidden="true"
                              >
                                <svg
                                  viewBox="0 0 24 24"
                                  width="14"
                                  height="14"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <circle cx="12" cy="12" r="4" />
                                </svg>
                              </span>
                              To break-even: ₹{formatINR(toBreakEvenTotal)} (₹
                              {formatINR(toBreakEvenPerShare)}/sh)
                            </div>
                          )}
                          <div className={`${styles.chip} ${styles.chipUp}`}>
                            <span
                              className={styles.chipIcon}
                              aria-hidden="true"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="14"
                                height="14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  d="M5 15l7-7 7 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            +1% move: ₹{formatINR(delta1pct)}
                          </div>
                          <div className={`${styles.chip} ${styles.chipDown}`}>
                            <span
                              className={styles.chipIcon}
                              aria-hidden="true"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                width="14"
                                height="14"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path
                                  d="M5 9l7 7 7-7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                            -1% move: ₹{formatINR(Math.abs(deltaNeg1pct))}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Trade form */}
          <div className={styles.formCard}>
            <div className={styles.actionToggle}>
              <button
                className={`${styles.toggleBtn} ${
                  side === "BUY" ? styles.toggleActiveBuy : ""
                }`}
                onClick={() => setSide("BUY")}
              >
                Buy
              </button>
              <button
                className={`${styles.toggleBtn} ${
                  side === "SELL" ? styles.toggleActiveSell : ""
                }`}
                onClick={() => setSide("SELL")}
              >
                Sell
              </button>
            </div>

            <div className={styles.orderTypeToggle}>
              <button
                className={`${styles.typeBtn} ${
                  orderType === "MARKET" ? styles.typeBtnActive : ""
                }`}
                onClick={() => setOrderType("MARKET")}
              >
                Market
              </button>
              <button
                className={`${styles.typeBtn} ${
                  orderType === "LIMIT" ? styles.typeBtnActive : ""
                }`}
                onClick={() => setOrderType("LIMIT")}
              >
                Limit
              </button>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="qty">
                  Quantity
                </label>
                <input
                  id="qty"
                  className={styles.input}
                  type="number"
                  min={1}
                  step={1}
                  value={qty}
                  onChange={(e) => {
                    const v = Math.max(
                      1,
                      Math.floor(Number(e.target.value || 1))
                    );
                    setQty(Number.isFinite(v) ? v : 1);
                  }}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.label} htmlFor="price">
                  {orderType === "MARKET" ? "Market price" : "Limit price"}
                </label>
                <input
                  id="price"
                  className={styles.input}
                  type="number"
                  step="0.05"
                  disabled={orderType === "MARKET"}
                  value={orderType === "MARKET" ? holding.ltp : limitPrice}
                  onChange={(e) =>
                    setLimitPrice(Number(e.target.value || holding.ltp))
                  }
                />
              </div>
            </div>

            <div className={styles.summaryRow}>
              <div>Estimated total</div>
              <div className={styles.totalValue}>₹{formatINR(estTotal)}</div>
            </div>

            <button
              className={`${styles.executeBtn} ${
                side === "BUY" ? styles.executeBuy : styles.executeSell
              }`}
              onClick={() => {
                // For now, just close the modal to simulate action
                onClose();
              }}
            >
              {side === "BUY" ? "Execute Buy" : "Execute Sell"}
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;
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

export default HoldingDetailModal;
