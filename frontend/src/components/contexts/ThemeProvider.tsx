"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// Define the shape of the context data
interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
}

// Create the context with a default value
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Define the provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState("light"); // Default theme

  useEffect(() => {
    // 1. Check localStorage first
    const localTheme = localStorage.getItem("theme");

    if (localTheme) {
      setTheme(localTheme);
    } else if (
      // 2. If no localStorage, check system preference
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      setTheme("dark");
    }
  }, []); // Empty array means this runs only once on mount

  // This effect runs whenever the 'theme' state changes
  useEffect(() => {
    // 1. Update localStorage
    localStorage.setItem("theme", theme);

    // 2. Update the <body> class
    const body = document.body;
    body.classList.remove("light", "dark");
    body.classList.add(theme);
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
