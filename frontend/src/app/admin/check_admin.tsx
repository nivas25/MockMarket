"use client";
import { jwtDecode } from "jwt-decode";
import Display_Admin from "./display";
import LoadingScreen from "../../components/common/LoadingScreen";

type DecodedToken = {
  role?: string;
  sub?:
    | {
        role?: string;
        email?: string;
      }
    | string;
};

// Admin emails - must match backend
const ADMIN_EMAILS = new Set([
  "manumahadev44@gmail.com",
  "nivas3347r@gmail.com",
]);

export default function AdminPage() {
  if (typeof window === "undefined") return null;

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.log("❌ No token found");
      window.location.href = "/unauthorized_access";
      return <LoadingScreen message="Verifying admin access" />;
    }

    const decoded = jwtDecode<DecodedToken>(token);
    console.log("🔍 Decoded JWT:", decoded);

    // Check role from multiple possible locations
    let role = decoded?.role;
    let email = "";

    if (typeof decoded?.sub === "object") {
      role = role || decoded.sub.role;
      email = decoded.sub.email || "";
    }

    console.log("👤 Role:", role, "Email:", email);

    // Check if admin by role OR by email (fallback)
    const isAdmin = role === "admin" || ADMIN_EMAILS.has(email);

    if (isAdmin) {
      console.log("✅ Admin access granted");
      return <Display_Admin />;
    }

    console.log("❌ Not an admin - Role:", role, "Email:", email);
    window.location.href = "/unauthorized_access";
    return <LoadingScreen message="Verifying admin access" />;
  } catch (error) {
    console.error("❌ JWT decode error:", error);
    window.location.href = "/unauthorized_access";
    return <LoadingScreen message="Verifying admin access" />;
  }
}
