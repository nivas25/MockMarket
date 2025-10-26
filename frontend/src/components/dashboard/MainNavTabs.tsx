import styles from "./MainNavTabs.module.css";
import type { DashboardTab } from "../../app/dashboard/types";

type MainNavTabsProps = {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
};

const tabs: DashboardTab[] = ["Explore", "Holdings", "Orders", "Watchlist"];

export function MainNavTabs({ activeTab, onTabChange }: MainNavTabsProps) {
  return (
    <nav
      className={styles.mainNav}
      role="tablist"
      aria-label="Dashboard sections"
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`${styles.navLink} ${
            activeTab === tab ? styles.active : ""
          }`}
          onClick={() => onTabChange(tab)}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          tabIndex={activeTab === tab ? 0 : -1}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}
