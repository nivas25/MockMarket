"use client";

import styles from "./AdminTopBar.module.css";
import { MoonIcon, SunIcon } from "../dashboard/Icons";
import type { SVGProps } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMarketStatus } from "../../utils/marketHours";

const ArrowLeftIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 12H5m0 0l7 7m-7-7l7-7"
    />
  </svg>
);

export type AdminTopBarProps = {
  theme?: string;
  isScrolled: boolean;
  onToggleTheme: () => void;
};

export function AdminTopBar({
  theme = "light",
  isScrolled,
  onToggleTheme,
}: AdminTopBarProps) {
  const router = useRouter();
  const marketStatus = useMarketStatus();

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
              <span
                className={`${styles.dot} ${
                  marketStatus.isOpen ? styles.dotOpen : styles.dotClosed
                }`}
              />
              {marketStatus.label} •{" "}
              <span className={styles.brandText}>Market</span>
              <span className={styles.simBadge}>Paper</span>
            </div>
          </div>

          {/* Admin title replacing search */}
          <div className={styles.adminTitleCluster}>
            <svg
              className={styles.adminIcon}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span className={styles.adminTitle}>Admin Panel</span>
          </div>

          {/* Actions */}
          <div className={styles.actionsCluster}>
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
          </div>
        </div>
      </header>

      {/* Back to Dashboard Button */}
      <button
        className={styles.backButton}
        onClick={() => router.push("/dashboard")}
        title="Back to Dashboard"
        type="button"
      >
        <ArrowLeftIcon className={styles.backIcon} />
      </button>
    </div>
  );
}
