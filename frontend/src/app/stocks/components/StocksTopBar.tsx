"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { useTheme } from "@/components/contexts/ThemeProvider";
import Link from "next/link"; // 1. Import Link
import { ArrowLeft } from "lucide-react"; // 2. Import the icon
import styles from "@/components/dashboard/TopBar.module.css"; // 3. Import styles

export default function StocksTopBar() {
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    // 4. Use a Fragment to return multiple elements
    <>
      {/* 5. Add the new sticky back button */}
      <Link href="/dashboard" className={styles.stickyBackButton}>
        <ArrowLeft className={styles.buttonIcon} />
      </Link>

      {/* This is your existing TopBar component */}
      <TopBar
        theme={theme}
        isScrolled={isScrolled}
        onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
      />
    </>
  );
}
