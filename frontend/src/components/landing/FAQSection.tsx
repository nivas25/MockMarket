"use client";
import "./faq.css";

// Simple Plus/Minus Icon for the accordion
const IconAccordion = () => (
  <svg
    className="faq-icon"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon-plus"
      d="M12 4.5v15m7.5-7.5h-15"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      className="icon-minus"
      d="M19.5 12h-15"
    />
  </svg>
);

export default function FAQSection() {
  return (
    <section className="faq" id="faq">
      <div className="faq-container">
        <h2 className="faq-title">
          Frequently Asked <span className="faq-title-gold">Questions</span>
        </h2>
        <p className="faq-subtitle">
          Have questions? We've got answers. If you don't see what you're
          looking for, feel free to contact us.
        </p>

        <div className="faq-grid">
          {/* FAQ Item 1 (FIX: 'open' attribute removed) */}
          <details className="faq-item">
            <summary className="faq-question">
              Is this real money?
              <IconAccordion />
            </summary>
            <div className="faq-answer">
              <p>
                No. MockMarket is a 100% free simulator. You trade with virtual
                money, so you can learn without any financial risk.
              </p>
            </div>
          </details>

          {/* FAQ Item 2 */}
          <details className="faq-item">
            <summary className="faq-question">
              Where does the market data come from?
              <IconAccordion />
            </summary>
            <div className="faq-answer">
              <p>
                Our platform is powered by the official Upstox API. This means
                you are trading with the same real-time data that live traders
                use.
              </p>
            </div>
          </details>

          {/* FAQ Item 3 */}
          <details className="faq-item">
            <summary className="faq-question">
              Do I need an Upstox account to use this?
              <IconAccordion />
            </summary>
            <div className="faq-answer">
              <p>
                No. You only need to create a free MockMarket account. We handle
                all the data connections in the background. You can sign up and
                start trading in seconds.
              </p>
            </div>
          </details>

          {/* FAQ Item 4 */}
          <details className="faq-item">
            <summary className="faq-question">
              What's the goal of this project?
              <IconAccordion />
            </summary>
            <div className="faq-answer">
              <p>
                Our goal is to provide a safe and realistic environment for you
                to learn trading. We built this to help students, beginners, and
                even experienced traders test new strategies.
              </p>
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
