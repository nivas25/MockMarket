import DashboardClient from "./DashboardClient";
import type { DashboardPageProps } from "./types";
import CheckvalidUser from "./check_valid_user";

export const metadata = {
  title: "Dashboard | MockMarket",
  description: "Track indices, holdings, orders, and your watchlist.",
};

export default function DashboardPage() {
  return <CheckvalidUser  />;
}
