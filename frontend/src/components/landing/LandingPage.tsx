import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import InfoSection from "./InfoSection";
import FAQSection from "./FAQSection";
import Footer from "./Footer";
import BottomDock from "./BottomDock";
import "./landing.css";
import "./features.css";
import "./info.css";
import "./faq.css";
import "./footer.css";
import "./bottom-dock.css";

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
