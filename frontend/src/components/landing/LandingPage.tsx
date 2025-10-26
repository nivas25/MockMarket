"use client"; // Keep this if HeroSection or BottomDock need it

import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import InfoSection from "./InfoSection";
import FAQSection from "./FAQSection";
import Footer from "./Footer";
import BottomDock from "./BottomDock";

// Import ONLY the new, unified CSS file
import "./landing.css";

export default function LandingPage() {
  return (
    <div className="landing">
      <HeroSection />
      <FeaturesSection />
      <InfoSection />
      <FAQSection />
      <Footer />
      <BottomDock />
    </div>
  );
}
