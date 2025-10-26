import "./footer.css";
import Image from "next/image";

// --- ICONS ---
const IconGitHub = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
    className="footer-icon"
  >
    <path
      fillRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.564 9.564 0 012.518.337c1.909-1.296 2.747-1.026 2.747-1.026.546 1.379.202 2.398.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      clipRule="evenodd"
    />
  </svg>
);

const IconLinkedIn = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="currentColor"
    viewBox="0 0 24 24"
    className="footer-icon"
  >
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="footer" id="page-footer">
      {" "}
      {/* <-- ID IS ADDED HERE */}
      <div className="footer-container">
        {/* Top Section */}
        <div className="footer-top">
          <div className="footer-logo">
            <Image
              src="/rabbit/mm_logo.png"
              alt="MockMarket"
              width={100}
              height={100}
              quality={100}
              className="footer-rabbit-logo"
            />
            <span>MockMarket</span>
          </div>
          <div className="footer-socials">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <IconGitHub />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
            >
              <IconLinkedIn />
            </a>
          </div>
        </div>

        {/* Disclaimer & Risk Info */}
        <div className="footer-disclaimer">
          <p>
            This platform is for educational and simulation purposes only. All
            trading is virtual and does not involve real money.
          </p>
          <p>
            Market data is provided by the Upstox API. MockMarket is not a
            registered broker or financial advisor. Information provided should
            not be construed as investment advice.
          </p>
          <p>
            Trading involves risk. Please consult a financial professional
            before investing real money.
          </p>
        </div>

        {/* Contact & Legal Links */}
        <div className="footer-bottom">
          <p className="footer-contact">
            Contact:{" "}
            <a href="mailto:support@mockmarket.com">support@mockmarket.com</a>
          </p>
          <div className="footer-links">
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/risk-disclosure">Risk Disclosure</a>
          </div>
          <p className="footer-copyright">
            &copy; {new Date().getFullYear()} MockMarket. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
