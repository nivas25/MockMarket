"use client";

import styles from "./TopBar.module.css";
import { MoonIcon, SunIcon } from "./Icons";
import type { SVGProps } from "react";
import Image from "next/image";
import ProfileMenu from "../profile/ProfileMenu";
import StockSearch from "../search/StockSearch";

// Inline icons for actions
const BellIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 8.25V8A6 6 0 006 8v.25a8.967 8.967 0 01-2.311 7.522c1.766.64 3.607 1.085 5.454 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
    />
  </svg>
);
const LightningIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 3L4 14h6l-1 7 9-11h-6l1-7z"
    />
  </svg>
);

export type TopBarProps = {
  theme?: string;
  isScrolled: boolean;
  onToggleTheme: () => void;
  onReset?: () => void;
  onLogout?: () => void;
  onNewOrder?: () => void;
  onOpenNotifications?: () => void;
  user?: {
    name?: string;
    email?: string;
    joinedAt?: string;
    balanceINR?: number;
  };
};

export function TopBar({
  theme = "light",
  isScrolled,
  onToggleTheme,
  onReset,
  onLogout,
  onNewOrder,
  onOpenNotifications,
  user,
}: TopBarProps) {
  const wrapperClass = `${styles.topBarWrapper} ${
    isScrolled ? styles.scrolled : ""
  }`;

  return (
    <div className={wrapperClass}>
      <header className={styles.topBar}>
        <div className={styles.capsule}>
          {/* Brand cluster */}
          <div className={styles.brandCluster}>
            <div className={styles.logoArea}>
              <Image
                src="/rabbit/mm_logo.png"
                alt="MockMarket"
                width={40}
                height={40}
                quality={100}
                priority
                className={styles.rabbitLogo}
              />
              <span className={styles.brandText}>MockMarket</span>
            </div>
            <div className={styles.marketBadge}>
              <span className={`${styles.dot} ${styles.dotOpen}`} />
              Live • <span className={styles.brandText}>Market</span>
              <span className={styles.simBadge}>Paper</span>
            </div>
          </div>

          {/* Command search */}
          <div className={styles.searchCluster}>
            <StockSearch />
          </div>

          {/* Actions */}
          <div className={styles.actionsCluster}>
            {onNewOrder && (
              <button
                className={`${styles.actionBtn} ${styles.primary}`}
                onClick={onNewOrder}
                type="button"
              >
                <LightningIcon className={styles.buttonIcon} />
                <span className={styles.actionLabel}>New Order</span>
              </button>
            )}
            <button
              className={`${styles.iconButton} ${styles.notifBtn}`}
              onClick={onOpenNotifications}
              title="Notifications"
              type="button"
            >
              <BellIcon className={styles.buttonIcon} />
              <span className={styles.notifDot} />
            </button>
            <button
              className={`${styles.iconButton} ${styles.themeToggle}`}
              onClick={onToggleTheme}
              title="Toggle Theme"
              type="button"
            >
              <span className={styles.buttonIcon}>
                {theme === "light" ? <MoonIcon /> : <SunIcon />}
              </span>
            </button>
            <ProfileMenu user={user} onReset={onReset} onLogout={onLogout} />
          </div>
        </div>
      </header>
    </div>
  );
}
