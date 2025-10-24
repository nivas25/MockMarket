"use client";

import { useState, useEffect } from "react";
import "./bottom-dock.css";
import { useTheme } from "../contexts/ThemeProvider";

// --- Icons (All your icons are the same, IconTop is fixed) ---

const IconTop = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="dock-icon"
  >
    <path
      fillRule="evenodd"
      d="M12 20.25a.75.75 0 01-.75-.75V5.81l-4.72 4.72a.75.75 0 01-1.06-1.06l6-6a.75.75 0 011.06 0l6 6a.75.75 0 11-1.06 1.06l-4.72-4.72V19.5a.75.75 0 01-.75.75z"
      clipRule="evenodd"
    />
  </svg>
);
const IconFeatures = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="dock-icon"
  >
    <path
      fillRule="evenodd"
      d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z"
      clipRule="evenodd"
    />
    <path
      fillRule="evenodd"
      d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-6.75a.75.75 0 01-.75-.75V3z"
      clipRule="evenodd"
    />
  </svg>
);
const IconInfo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="dock-icon"
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.25-4.25a.75.75 0 00-1.5 0v4.5c0 .414.336.75.75.75h3a.75.75 0 000-1.5h-2.25v-3z"
      clipRule="evenodd"
    />
  </svg>
);
const IconFAQ = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="dock-icon"
  >
    <path
      fillRule="evenodd"
      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm11.378-3.917c.44-.322.772-.748.968-1.228a.75.75 0 00-1.44-.542A2.25 2.25 0 0112 8.25c-1.135 0-2.146.6-2.622 1.516a.75.75 0 101.44.542 2.25 2.25 0 012.12-1.228zM12 15.75a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75v-.008z"
      clipRule="evenodd"
    />
  </svg>
);
const IconSun = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="dock-icon"
  >
    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.834 6.166a.75.75 0 00-1.06 1.06l1.59 1.591a.75.75 0 001.061-1.06l-1.59-1.591zM6.166 17.834a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM3 12a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H3.75A.75.75 0 013 12z" />
  </svg>
);
const IconMoon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="dock-icon"
  >
    <path
      fillRule="evenodd"
      d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6.75a8.97 8.97 0 006.968 8.97c.337.056.676.034.986-.064a.75.75 0 01.445 1.43a10.472 10.472 0 01-3.442.82c-5.42 0-9.86-4.32-9.998-9.718A10.472 10.472 0 019.528 1.718z"
      clipRule="evenodd"
    />
  </svg>
);

export default function BottomDock() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isFooterVisible, setIsFooterVisible] = useState(false);
  const { theme, setTheme } = useTheme();

  // --- NEW STATE FOR ACTIVE SECTION ---
  const [activeSection, setActiveSection] = useState("top");

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    // 1. Scroll listener for show/hide and "Top" active state
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsScrolled(scrollY > 500);

      // Set "Top" as active if we are near the top
      if (scrollY < 600) {
        setActiveSection("top");
      }
    };
    window.addEventListener("scroll", handleScroll);

    // 2. Footer observer for hiding the dock
    const footerObserver = new IntersectionObserver(
      ([entry]) => {
        setIsFooterVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    const footer = document.getElementById("page-footer");
    if (footer) {
      footerObserver.observe(footer);
    }

    // --- 3. NEW SECTION OBSERVER for active links ---
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When a section is in the trigger zone, set it as active
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        // This creates a "trigger line" 30% from the top of the viewport
        rootMargin: "-30% 0px -69% 0px",
      }
    );

    // Observe all the sections
    const sections = document.querySelectorAll("#features, #info, #faq");
    sections.forEach((section) => {
      sectionObserver.observe(section);
    });

    // Cleanup all listeners and observers
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (footer) {
        footerObserver.unobserve(footer);
      }
      sections.forEach((section) => {
        sectionObserver.unobserve(section);
      });
    };
  }, []); // Runs only once on mount

  const isVisible = isScrolled && !isFooterVisible;

  return (
    <nav className={`bottom-dock ${isVisible ? "dock-visible" : ""}`}>
      <div className="dock-pill">
        {/* --- ADD ACTIVE CLASS LOGIC --- */}
        <a
          href="#"
          className={`dock-link ${activeSection === "top" ? "active" : ""}`}
          aria-label="Scroll to Top"
        >
          <IconTop />
          <span className="dock-label">Top</span>
        </a>
        <a
          href="#features"
          className={`dock-link ${
            activeSection === "features" ? "active" : ""
          }`}
          aria-label="Features"
        >
          <IconFeatures />
          <span className="dock-label">Features</span>
        </a>
        <a
          href="#info"
          className={`dock-link ${activeSection === "info" ? "active" : ""}`}
          aria-label="Info"
        >
          <IconInfo />
          <span className="dock-label">Info</span>
        </a>
        <a
          href="#faq"
          className={`dock-link ${activeSection === "faq" ? "active" : ""}`}
          aria-label="FAQ"
        >
          <IconFAQ />
          <span className="dock-label">FAQ</span>
        </a>

        <button
          className="dock-theme-toggle"
          aria-label="Toggle Theme"
          onClick={toggleTheme}
        >
          {theme === "light" ? <IconMoon /> : <IconSun />}
        </button>
      </div>
    </nav>
  );
}
