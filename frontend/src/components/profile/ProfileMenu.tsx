"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ProfileMenu.module.css";
import { useRouter } from "next/navigation";
import { ProfileIcon } from "../dashboard/Icons";
import GlassConfirm from "./GlassConfirm";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { url } from "../../config"

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

const ProfileMenu: React.FC<ProfileMenuProps> = ({ user, onReset, onLogout }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);

  // --- Store user info (from props or decoded JWT) ---
  const [userData, setUserData] = useState(user);
  const [userId, setUserId] = useState<string | number | null>(null); // Track user_id separately

  const fetchUserBalance = async (user_id: string | number) => {
    try {
      if (!user_id) {
        alert("User ID not found for fetching balance.");
        localStorage.removeItem("authToken");
        window.location.href = '/';
        return;
      }
      console.log("Fetching balance for user_id:", user_id); // Debug log
      const response = await axios.post(`${url}/fetch/user_balance`, { user_id }); // Send as JSON body
      console.log("Balance API response:", response.data); // Debug log
      if (response.data.status === "success") {
        setBalance(response.data.balance); // Update state
      } else {
        console.warn("Unexpected API status:", response.data.status);
      }
    } catch (err: any) {
      console.error("Error fetching user balance:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("authToken");
        window.location.href = '/';
      }
    } finally {
      console.log("Fetch user balance attempt finished.");
    }
  };

  // First useEffect: Decode JWT and set userData + userId
  useEffect(() => {
    let decodedUserId: string | number;
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        console.log("Decoding JWT token to extract user data.");
        console.log("JWT token:", token);
        const decoded: any = jwtDecode(token);
        decodedUserId = decoded.sub.user_id;
        setUserData({
          name: decoded.sub.name || "User",
          email: decoded.sub.email || "user@email.com",
          joinedAt: decoded.sub.joinedAt || new Date().toISOString(),
        });
        setUserId(decodedUserId); // Set user_id after decoding
      } else {
        console.log("No auth token found in storage.");
      }
    } catch (error) {
      console.error("JWT decode failed:", error);
      // Optionally clear invalid token
      localStorage.removeItem("authToken");
    }
  }, [user]); // Re-run if props.user changes

  // Second useEffect: Fetch balance once userId is available
  useEffect(() => {
    if (userId !== null) { // Only fetch if userId is set (not initial null)
      fetchUserBalance(userId);
    }
  }, [userId]); // Depend on userId

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

  // Use fetched balance or fallback
  const currentBalance = balance ?? userData?.balance ?? 0;
  const balanceLabel = useMemo(() => {
    return `₹${currentBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
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
              <div>
                <div className={styles.name}>{name}</div>
                <div className={styles.email}>{email}</div>
              </div>
            </div>

            <div className={styles.infoList}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Joined</span>
                <span className={styles.infoValue}>{joinedAt}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Current Balance</span>
                <span className={styles.infoValue}>{balanceLabel}</span> {/* Use formatted label */}
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
                    } catch { }
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

      <GlassConfirm
        open={confirmOpen}
        title="Reset simulation?"
        message={
          <>
            This will clear your local simulation data and start fresh.
            <br /> This action can’t be undone.
          </>
        }
        confirmLabel="Reset"
        cancelLabel="Cancel"
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          setOpen(false);
          if (onReset) {
            onReset();
          } else {
            try {
              localStorage.clear();
              sessionStorage.clear();
            } catch { }
            window.location.reload();
          }
        }}
      />
    </div>
  );
};

export default ProfileMenu;