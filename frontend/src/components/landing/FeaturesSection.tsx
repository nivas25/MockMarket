import "./features.css";

// Placeholder SVG Icons
const IconTrade = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="feature-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
    />
  </svg>
);
const IconPortfolio = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="feature-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0A2.25 2.25 0 0018.75 9.75h-1.5a3 3 0 10-6 0h-1.5A2.25 2.25 0 003 12m18 0v6"
    />
  </svg>
);
const IconData = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className="feature-icon"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625C9.75 8.004 10.254 7.5 10.875 7.5h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 019.75 19.875V8.625zM16.5 4.125C16.5 3.504 17.004 3 17.625 3h2.25c.621 0 1.125.504 1.125 1.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25A1.125 1.125 0 0116.5 19.875V4.125z"
    />
  </svg>
);

export default function FeaturesSection() {
  return (
    <section className="features" id="features">
      <div className="features-container">
        <h2 className="features-title">Practice Perfect. Trade Real.</h2>
        <p className="features-subtitle">
          All the tools you need to master the market, risk-free.
        </p>
        <div className="features-grid">
          <div className="feature-card">
            <div className="card-icon-wrapper">
              <IconTrade />
            </div>
            <h3 className="card-title">Real-Time Trading</h3>
            <p className="card-description">
              Buy and sell stocks with live market data. Experience the thrill
              of trading without losing a single rupee.
            </p>
          </div>
          <div className="feature-card">
            <div className="card-icon-wrapper">
              <IconPortfolio />
            </div>
            <h3 className="card-title">Portfolio Tracking</h3>
            <p className="card-description">
              Watch your virtual portfolio grow. Track your profits, losses, and
              diversification just like a real brokerage.
            </p>
          </div>
          <div className="feature-card">
            <div className="card-icon-wrapper">
              <IconData />
            </div>
            <h3 className="card-title">Live Market Data</h3>
            <p className="card-description">
              Access real-time stock prices and market trends. Make informed
              decisions based on up-to-the-minute data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
