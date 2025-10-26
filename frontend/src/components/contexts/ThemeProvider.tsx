"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Define the shape of the context data
type ThemeMode = "light" | "dark";
interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define the provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    // Resolve initial theme once during first render (client only)
    if (typeof window === "undefined") return "light";
    const stored = (window.localStorage.getItem("theme") || "").toLowerCase();
    if (stored === "light" || stored === "dark") return stored as ThemeMode;
    try {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

  // This effect runs whenever the 'theme' state changes
  useEffect(() => {
    // 1. Persist selection
    localStorage.setItem("theme", theme);

    // 2. Update DOM markers for CSS and components to consume
    const html = document.documentElement;
    const body = document.body;

    // Classes
    html.classList.remove("light", "dark");
    body.classList.remove("light", "dark");
    html.classList.add(theme);
    body.classList.add(theme);

    // data-theme attributes
    html.setAttribute("data-theme", theme);
    body.setAttribute("data-theme", theme);

    // Prefer correct UA styling for form controls in supported browsers
    html.style.colorScheme = theme;
  }, [theme]); // Run this effect when 'theme' changes

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// This is the custom hook that our components will use
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
