import "./info.css";

// --- ICONS ---

// Icon 1: Shield (Zero Risk)
const IconShield = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="info-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 2L3 6v6c0 5 3.58 9.74 9 11 5.42-1.26 9-6 9-11V6l-9-4zM9 12l2 2 4-4"
    />
  </svg>
);

// Icon 2: Database (Real-Time Market Data)
const IconDatabase = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="info-icon"
  >
    <ellipse
      cx="12"
      cy="6"
      rx="9"
      ry="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 6v12c0 1.66 4.03 3 9 3s9-1.34 9-3V6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Icon 3: Interface (Simple, Intuitive Interface)
const IconInterface = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="info-icon"
  >
    <rect
      x="3"
      y="4"
      width="18"
      height="16"
      rx="2"
      ry="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="3"
      y1="8"
      x2="21"
      y2="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="7"
      y1="4"
      x2="7"
      y2="8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Icon 4: Line Chart (Track Performance)
const IconChart = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="info-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 3v18h18M3 15l4-4 4 4 8-8"
    />
  </svg>
);

export default function InfoSection() {
  return (
    <section className="info" id="info">
      <div className="info-container">
        {/* Column 1: Honest Text Content */}
        <div className="info-content">
          <h2 className="info-title">
            Why <span className="info-title-gold">MockMarket</span>?
          </h2>
          <p className="info-description">
            MockMarket is a realistic stock trading simulator that lets you
            practice in a safe, risk-free environment. Using the{" "}
            <strong>Upstox API</strong>, it provides real-time market data,
            helping you see how prices move in actual markets.
          </p>
          <p className="info-description">
            Test strategies, observe market patterns, and gain hands-on
            experience all without spending real money.
          </p>
        </div>

        {/* Column 2: Honest Highlights List */}
        <div className="info-highlights">
          <ul className="highlights-list">
            <li className="highlight-item">
              <div className="highlight-icon-wrapper">
                <IconShield />
              </div>
              <span>100% Risk-Free Trading</span>
            </li>
            <li className="highlight-item">
              <div className="highlight-icon-wrapper">
                <IconDatabase />
              </div>
              <span>Real-Time Market Data</span>
            </li>
            <li className="highlight-item">
              <div className="highlight-icon-wrapper">
                <IconInterface />
              </div>
              <span>Simple, Intuitive Interface</span>
            </li>
            <li className="highlight-item">
              <div className="highlight-icon-wrapper">
                <IconChart />
              </div>
              <span>Track Your Performance Live</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
