"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ProfileMenu.module.css";
import { useRouter } from "next/navigation";
import { ProfileIcon } from "../dashboard/Icons";
import GlassConfirm from "./GlassConfirm";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { url } from "../../config";

// Admin emails - must match backend
const ADMIN_EMAILS = new Set([
  "manumahadev44@gmail.com",
  "nivas3347r@gmail.com",
]);

type ProfileMenuProps = {
  user?: {
    name?: string;
    email?: string;
    joinedAt?: string;
    balance?: number;
  };
  onReset?: () => void;
  onLogout?: () => void;
};

const ProfileMenu: React.FC<ProfileMenuProps> = ({
  user,
  onReset,
  onLogout,
}) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const [balance, setBalance] = useState<number | null>(null);

  // --- Store user info (from props or decoded JWT) ---
  const [userData, setUserData] = useState(user);
  const [userId, setUserId] = useState<string | number | null>(null); // Track user_id separately
  const [userRole, setUserRole] = useState<string | null>(null); // Track user role

  const fetchUserBalance = async (user_id: string | number) => {
    try {
      if (!user_id) {
        alert("User ID not found for fetching balance.");
        localStorage.removeItem("authToken");
        window.location.href = "/";
        return;
      }
      console.log("Fetching balance for user_id:", user_id);
      const response = await axios.post(`${url}/fetch/user_balance`, {
        user_id,
      });
      console.log("Balance API response:", response.data);
      if (response.data.status === "success") {
        setBalance(response.data.balance);
      } else {
        console.warn("Unexpected API status:", response.data.status);
      }
    } catch (err: unknown) {
      console.error("Error fetching user balance:", err);
      if (
        axios.isAxiosError(err) &&
        (err.response?.status === 401 || err.response?.status === 403)
      ) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("authToken");
        window.location.href = "/";
      }
    } finally {
      console.log("Fetch user balance attempt finished.");
    }
  };

  // Decode JWT token on mount
  useEffect(() => {
    let decodedUserId: string | number;
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        const decoded = jwtDecode<{
          sub: {
            user_id: string | number;
            name?: string;
            email?: string;
            joinedAt?: string;
            role?: string;
          };
          role?: string;
        }>(token);
        decodedUserId = decoded.sub.user_id;
        const userEmail = decoded.sub.email || "user@email.com";

        setUserData({
          name: decoded.sub.name || "User",
          email: userEmail,
          joinedAt: decoded.sub.joinedAt || new Date().toISOString(),
        });
        setUserId(decodedUserId);

        // Check role from JWT or fallback to email check
        const roleFromToken = decoded.sub.role || decoded.role;
        const isAdminByEmail = ADMIN_EMAILS.has(userEmail);
        const finalRole =
          roleFromToken === "admin" || isAdminByEmail ? "admin" : "user";

        console.log(
          "🔍 Profile Menu - Role:",
          roleFromToken,
          "Email:",
          userEmail,
          "Is Admin:",
          finalRole === "admin"
        );
        setUserRole(finalRole);
      } else {
        console.log("No auth token found in storage.");
      }
    } catch (error) {
      console.error("JWT decode failed:", error);
      localStorage.removeItem("authToken");
    }
  }, [user]);

  // Fetch balance when userId changes
  useEffect(() => {
    if (userId !== null) {
      fetchUserBalance(userId);
    }
  }, [userId]);

  const name = userData?.name ?? "User Name";
  const email = userData?.email ?? "user@email.com";
  const joinedAt = useMemo(() => {
    const src =
      userData?.joinedAt ||
      (typeof window !== "undefined"
        ? localStorage.getItem("joinedAt") || ""
        : "");
    if (!src) return "—";
    const d = new Date(src);
    return isNaN(d.getTime()) ? src : d.toLocaleDateString();
  }, [userData?.joinedAt]);

  const currentBalance = balance ?? userData?.balance ?? 0;
  const balanceLabel = useMemo(() => {
    return `₹${currentBalance.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
    })}`;
  }, [currentBalance]);

  const computePosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const menuWidth = 300;
    const left = Math.max(
      8,
      Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8)
    );
    const top = Math.min(r.bottom + 8, window.innerHeight - 8);
    setCoords({ top, left });
  };

  useEffect(() => {
    if (!open) return;
    computePosition();

    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onLayout = () => computePosition();

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [open]);

  return (
    <div className={styles.profileMenuContainer}>
      <button
        ref={buttonRef}
        className={styles.profileIcon}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        type="button"
        title="Profile"
      >
        <ProfileIcon className={styles.buttonIcon} />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menuBox}
            role="menu"
            aria-label="Profile menu"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              minWidth: 300,
              zIndex: 1000,
            }}
          >
            <div className={styles.headerRow}>
              <div className={styles.userInfo}>
                <div className={styles.name}>{name}</div>
                <div className={styles.email}>{email}</div>
              </div>
              {userRole === "admin" && (
                <button
                  className={styles.adminBadgeButton}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push("/admin");
                  }}
                  title="Go to Admin Panel"
                >
                  <svg
                    className={styles.adminBadgeIcon}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </button>
              )}
            </div>

            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Joined</span>
                <span className={styles.infoValue}>{joinedAt}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Current Balance</span>
                <span className={styles.infoValue}>{balanceLabel}</span>
              </div>
            </div>

            <div className={styles.actionsRow}>
              <button
                className={styles.resetBtn}
                type="button"
                onClick={() => setConfirmOpen(true)}
              >
                Reset
              </button>
              <button
                className={styles.logoutBtn}
                type="button"
                onClick={() => {
                  if (onLogout) {
                    onLogout();
                  } else {
                    try {
                      localStorage.removeItem("authToken");
                      sessionStorage.removeItem("authToken");
                    } catch {}
                    router.push("/");
                  }
                }}
              >
                Log out
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ✅ Delete user confirmation popup */}
      <GlassConfirm
        open={confirmOpen}
        title="Reset simulation?"
        message={
          <>
            This will permanently delete your account and all data.
            <br /> This action cannot be undone.
          </>
        }
        confirmLabel="Yes, Delete My Account"
        cancelLabel="Cancel"
        onClose={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          setOpen(false);

          try {
            const token = localStorage.getItem("authToken");
            if (!token) {
              alert("User not logged in.");
              router.push("/");
              return;
            }

            const decoded = jwtDecode<{ sub: { user_id: number } }>(token);
            const user_id = decoded?.sub?.user_id;

            if (!user_id) {
              alert("Invalid token. Please login again.");
              localStorage.removeItem("authToken");
              router.push("/");
              return;
            }

            // ✅ Send JSON exactly like { "user_id": 15 }
            const response = await axios.delete(`${url}/user/delete`, {
              data: { user_id },
              headers: { "Content-Type": "application/json" },
            });

            console.log("Delete response:", response.data);

            if (response.data.status === "success") {
              alert("✅ Your account and data have been deleted successfully.");
            } else {
              alert(`⚠️ ${response.data.message || "Failed to delete user."}`);
            }

            // ✅ Clear local/session storage and redirect
            localStorage.clear();
            sessionStorage.clear();
            router.push("/");
          } catch (error) {
            console.error("❌ Error during user deletion:", error);
            alert("Error deleting your account. Please try again later.");
          }
        }}
      />
    </div>
  );
};

export default ProfileMenu;
