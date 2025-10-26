import type { Metadata } from "next";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "Privacy Policy | MockMarket",
  description:
    "How MockMarket collects, uses, and protects your information on our educational simulation platform.",
};

export default function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last Updated: October 26, 2025</p>
        </div>

        <div className="legal-content">
          <section className="legal-section">
            <div className="warning-box">
              <h2>📚 Simulation Platform Notice</h2>
              <p>
                MockMarket is an educational simulation platform. We do NOT
                collect financial account information, Demat account details, or
                real trading credentials because we do NOT facilitate real money
                transactions.
              </p>
            </div>
          </section>

          <section className="legal-section">
            <h2>1. Introduction</h2>
            <p>
              MockMarket is committed to protecting your privacy. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your
              information when you use our educational stock trading simulation
              platform.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Information We Collect</h2>

            <h3>2.1 Personal Information</h3>
            <p>
              We may collect information that you voluntarily provide when you:
            </p>
            <ul>
              <li>Register for an account (name, email address)</li>
              <li>
                Use Google Sign-In (name, email, profile picture from Google)
              </li>
              <li>Contact customer support</li>
              <li>Subscribe to newsletters</li>
            </ul>

            <h3>2.2 Automatically Collected Information</h3>
            <p>When you access the Platform, we automatically collect:</p>
            <ul>
              <li>
                Device information (IP address, browser type, operating system)
              </li>
              <li>Usage data (pages visited, time spent, features used)</li>
              <li>Cookies and similar tracking technologies</li>
            </ul>

            <h3>2.3 Simulated Trading Data</h3>
            <p>We store your virtual trading activity on our platform:</p>
            <ul>
              <li>Virtual portfolio holdings (simulated positions only)</li>
              <li>Simulated trading history and patterns</li>
              <li>Watchlists and preferences</li>
              <li>Virtual performance metrics</li>
            </ul>
            <p>
              <strong>Important:</strong> This data represents simulated
              activity only and has no real-world financial value.
            </p>

            <h3>2.4 What We Do NOT Collect</h3>
            <ul>
              <li>Bank account information</li>
              <li>Demat account details</li>
              <li>Real trading credentials</li>
              <li>Financial transaction data</li>
              <li>Government-issued identification</li>
              <li>Tax identification numbers</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and maintain our simulation Platform</li>
              <li>
                Process your virtual trades and update your simulated portfolio
              </li>
              <li>Send administrative information and updates</li>
              <li>Respond to your comments, questions, and support requests</li>
              <li>
                Monitor and analyze usage and trends to improve user experience
              </li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Personalize your simulation experience</li>
              <li>Send educational content (with your consent)</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Information Sharing and Disclosure</h2>

            <h3>4.1 Third-Party Service Providers</h3>
            <p>
              We may share your information with third-party service providers:
            </p>
            <ul>
              <li>Google (for authentication via Google Sign-In)</li>
              <li>
                Upstox API (for real-time market data - they do NOT receive your
                personal information)
              </li>
              <li>Cloud storage providers (for secure data storage)</li>
              <li>Analytics platforms (for understanding platform usage)</li>
            </ul>

            <h3>4.2 Legal Requirements</h3>
            <p>
              We may disclose your information if required by law or in response
              to valid legal requests.
            </p>

            <h3>4.3 With Your Consent</h3>
            <p>
              We may share your information with third parties when you have
              given us explicit consent to do so.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Data Security</h2>
            <p>
              We implement appropriate security measures to protect your
              information:
            </p>
            <ul>
              <li>Secure authentication via Google Sign-In</li>
              <li>Data encryption in transit and at rest</li>
              <li>Secure database access controls</li>
              <li>Regular security updates</li>
            </ul>
            <p>
              However, no method of transmission over the Internet is 100%
              secure. While we strive to protect your information, we cannot
              guarantee absolute security.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Data Retention</h2>
            <p>
              We retain your account information and simulated trading history
              for as long as your account is active or as needed to provide
              services. You can request deletion of your account and associated
              data at any time.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Your Privacy Rights</h2>
            <p>You have the following rights:</p>
            <ul>
              <li>
                <strong>Access:</strong> Request a copy of your personal
                information
              </li>
              <li>
                <strong>Correction:</strong> Request correction of inaccurate
                information
              </li>
              <li>
                <strong>Deletion:</strong> Request deletion of your account and
                data
              </li>
              <li>
                <strong>Export:</strong> Request export of your simulated
                trading data
              </li>
            </ul>
            <p>
              To exercise these rights, please contact us at
              privacy@mockmarket.com
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Cookies and Tracking Technologies</h2>
            <p>We use cookies and similar tracking technologies for:</p>
            <ul>
              <li>
                <strong>Essential Cookies:</strong> Required for the Platform to
                function (authentication, session management)
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how users
                interact with the Platform
              </li>
              <li>
                <strong>Preference Cookies:</strong> Remember your settings
                (dark mode, language preferences)
              </li>
            </ul>
            <p>You can control cookies through your browser settings.</p>
          </section>

          <section className="legal-section">
            <h2>9. Third-Party Links</h2>
            <p>
              Our Platform may contain links to third-party websites. We are not
              responsible for the privacy practices of these third parties. We
              encourage you to read their privacy policies.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Age Restrictions</h2>
            <p>
              Our Platform is intended for educational purposes and may be used
              by individuals aged 13 and above with parental consent. We do not
              knowingly collect personal information from children under 13
              without parental consent.
            </p>
          </section>

          <section className="legal-section">
            <h2>11. Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of any changes by posting the new Privacy Policy on
              this page and updating the Last Updated date.
            </p>
          </section>

          <section className="legal-section">
            <h2>12. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please
              contact us at:
            </p>
            <p className="contact-info">
              Email: privacy@mockmarket.com
              <br />
              Support: support@mockmarket.com
            </p>
          </section>
        </div>

        <div className="legal-footer">
          <p>
            MockMarket is an educational simulation platform. We do NOT collect
            financial account information because we do NOT facilitate real
            money transactions.
          </p>
        </div>
      </div>
    </div>
  );
}
