import type { Metadata } from "next";
import "./terms.css";

export const metadata: Metadata = {
  title: "Terms of Service | MockMarket",
  description:
    "Terms and conditions for using MockMarket's educational stock trading simulation platform.",
};

export default function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <h1>Terms of Service</h1>
          <p className="legal-updated">Last Updated: October 26, 2025</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <div className="warning-box">
              <h2>📚 Educational Simulation Platform</h2>
              <p>
                MockMarket is a{" "}
                <strong>virtual trading simulation platform</strong> designed
                exclusively for educational and learning purposes. All trading
                activity is simulated and does NOT involve real money, real
                securities, or actual market transactions. We are NOT a
                registered broker-dealer, investment advisor, or Demat account
                provider.
              </p>
            </div>
          </section>

          <section className="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using MockMarket, you accept and agree to be
              bound by the terms and provision of this agreement. If you do not
              agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Platform Purpose and Nature</h2>
            <p>
              MockMarket is a <strong>simulation and educational tool</strong>{" "}
              that provides:
            </p>
            <ul>
              <li>
                Virtual portfolio management using simulated funds (no real
                money)
              </li>
              <li>Paper trading experience with real-time market data</li>
              <li>Educational resources for learning about stock markets</li>
              <li>Practice environment for testing trading strategies</li>
            </ul>
            <p>
              <strong>Important Clarifications:</strong>
            </p>
            <ul>
              <li>❌ No real money or securities are involved</li>
              <li>❌ We do NOT open Demat accounts or trading accounts</li>
              <li>❌ We do NOT execute real trades on any stock exchange</li>
              <li>
                ✅ All transactions are virtual and for learning purposes only
              </li>
              <li>
                ✅ Virtual profits/losses have no real-world financial impact
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Account Registration</h2>
            <p>
              To use the Platform, you may need to register for an account. You
              agree to:
            </p>
            <ul>
              <li>Provide accurate information during registration</li>
              <li>Maintain the security of your password</li>
              <li>Accept all risks of unauthorized access</li>
              <li>
                Notify us immediately of any unauthorized use of your account
              </li>
              <li>
                Understand that your account is for simulation purposes only
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Simulation and Virtual Trading</h2>
            <p>
              All trading on MockMarket is{" "}
              <strong>100% simulated and virtual</strong>:
            </p>
            <ul>
              <li>💰 Virtual funds provided have NO real monetary value</li>
              <li>
                📊 Market data is sourced from Upstox API (real-time or delayed)
              </li>
              <li>
                📝 Orders placed are simulated and do NOT reach actual stock
                exchanges
              </li>
              <li>
                📈 Portfolio performance represents virtual gains/losses only
              </li>
              <li>
                🚫 NO real money can be deposited, withdrawn, or transferred
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>5. Not Financial Advice</h2>
            <p>
              MockMarket is{" "}
              <strong>
                NOT a registered investment advisor, broker-dealer, or financial
                institution
              </strong>
              :
            </p>
            <ul>
              <li>
                We do NOT provide investment advice, financial planning, or
                portfolio management services
              </li>
              <li>
                Information provided is for educational and informational
                purposes ONLY
              </li>
              <li>
                No content should be construed as a recommendation to buy or
                sell securities
              </li>
              <li>
                Simulated performance does NOT guarantee real-world results
              </li>
              <li>
                Always consult with qualified financial professionals before
                making real investment decisions
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Market Data and Information</h2>
            <p>
              Market data, quotes, and charts provided through the Platform are
              obtained from third-party sources (Upstox API). We do not warrant
              the accuracy, completeness, or timeliness of such information.
              Market data may be delayed as per exchange agreements.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. User Conduct</h2>
            <p>You agree NOT to:</p>
            <ul>
              <li>
                Use the Platform for any illegal purpose or in violation of any
                laws
              </li>
              <li>Misrepresent the Platform as a real trading service</li>
              <li>Interfere with or disrupt the Platform or servers</li>
              <li>
                Attempt to gain unauthorized access to any portion of the
                Platform
              </li>
              <li>
                Use automated systems or software to extract data without
                permission
              </li>
              <li>Harass, abuse, or harm other users</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>8. Fees and Payments</h2>
            <p>
              MockMarket is currently a{" "}
              <strong>free educational platform</strong>. We reserve the right
              to introduce premium features with associated fees in the future,
              with reasonable advance notice to users.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Intellectual Property</h2>
            <p>
              The Platform and its original content, features, and functionality
              are owned by MockMarket and are protected by international
              copyright, trademark, patent, trade secret, and other intellectual
              property laws.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Limitation of Liability</h2>
            <p>
              In no event shall MockMarket, nor its directors, employees,
              partners, agents, suppliers, or affiliates, be liable for any
              indirect, incidental, special, consequential, or punitive damages
              resulting from:
            </p>
            <ul>
              <li>Your use of or inability to use the Platform</li>
              <li>Any conduct or content of any third party on the Platform</li>
              <li>Unauthorized access, use, or alteration of your data</li>
              <li>Decisions made based on simulated trading results</li>
              <li>
                Any reliance on simulated performance for real-world investment
                decisions
              </li>
            </ul>
            <p>
              <strong>
                Since all trading is simulated, no real financial losses can
                occur on our Platform. However, we are NOT liable for any
                real-world investment decisions you make based on your
                experience or information obtained from MockMarket.
              </strong>
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without
              prior notice or liability, for any reason whatsoever, including if
              you breach these Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Governing Law</h2>
            <p>
              These Terms shall be governed and construed in accordance with the
              laws of India, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="legal-section">
            <h2>13. Changes to Terms</h2>
            <p>
              We reserve the right to modify or replace these Terms at any time.
              If a revision is material, we will provide notice prior to any new
              terms taking effect.
            </p>
          </section>

          <section className="legal-section">
            <h2>14. Contact Information</h2>
            <p>
              If you have any questions about these Terms, please contact us at:
            </p>
            <p className="contact-info">
              Email: support@mockmarket.com
              <br />
              Platform: MockMarket - Educational Trading Simulator
            </p>
          </section>
        </div>

        <div className="legal-footer">
          <p>
            By using MockMarket, you acknowledge that this is a simulation
            platform for educational purposes only and does not involve real
            money or securities.
          </p>
        </div>
      </div>
    </div>
  );
}

