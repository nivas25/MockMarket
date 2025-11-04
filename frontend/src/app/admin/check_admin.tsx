"use client";
import { jwtDecode } from "jwt-decode";
import Display_Admin from "./display";
import LoadingScreen from "../../components/common/LoadingScreen";

type DecodedToken = {
  role?: string;
  sub?: { role?: string } | string;
};

export default function AdminPage() {
  if (typeof window === "undefined") return null;

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      window.location.href = "/unauthorized_access";
      return <LoadingScreen message="Verifying admin access" />;
    }
    const decoded = jwtDecode<DecodedToken>(token);
    const role =
      decoded?.role ||
      (typeof decoded?.sub === "object" ? decoded?.sub?.role : undefined);
    if (role === "admin") {
      return <Display_Admin />;
    }
    window.location.href = "/unauthorized_access";
    return <LoadingScreen message="Verifying admin access" />;
  } catch {
    window.location.href = "/unauthorized_access";
    return <LoadingScreen message="Verifying admin access" />;
  }
}
