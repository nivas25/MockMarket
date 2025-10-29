"use client";

import { useEffect, useState } from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { useTheme } from "@/components/contexts/ThemeProvider";

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
    <TopBar
      theme={theme}
      isScrolled={isScrolled}
      onToggleTheme={() => setTheme(theme === "light" ? "dark" : "light")}
    />
  );
}
