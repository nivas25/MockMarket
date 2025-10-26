import DashboardClient from "./DashboardClient";
import type { DashboardPageProps } from "./types";

export const metadata = {
  title: "Dashboard | MockMarket",
  description: "Track indices, holdings, orders, and your watchlist.",
};

export default function DashboardPage(props: DashboardPageProps = {}) {
  return <DashboardClient {...props} />;
}
