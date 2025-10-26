import type { Metadata } from "next";
import "../terms/terms.css";

export const metadata: Metadata = {
  title: "Risk Disclosure | MockMarket",
  description:
    "Understanding the educational nature of MockMarket simulation platform and real-world trading risks.",
};

export default function RiskDisclosure() {
  return (
    <div className="legal-page">
      <div className="legal-container">
        <div className="legal-header">
          <h1>Risk Disclosure Statement</h1>
          <p className="legal-updated">Last Updated: October 26, 2025</p>
        </div>

        <div className="legal-content">
          <section className="legal-section risk-warning">
            <div className="warning-box">
              <h2>⚠️ Important Notice - Simulation Platform</h2>
              <p>
                MockMarket is an{" "}
                <strong>EDUCATIONAL SIMULATION PLATFORM ONLY</strong>. All
                trading is virtual and does NOT involve real money or
                securities. However, this disclosure explains the risks you
                would face if you were to engage in REAL trading based on what
                you learn here.
              </p>
            </div>
          </section>

          <section className="legal-section">
            <h2>1. About MockMarket Simulation</h2>

            <h3>1.1 What MockMarket IS:</h3>
            <ul>
              <li>
                ✅ A FREE educational simulation platform for learning about
                stock trading
              </li>
              <li>
                ✅ A safe environment to practice trading strategies with
                virtual money
              </li>
              <li>
                ✅ A tool to understand market dynamics without financial risk
              </li>
              <li>
                ✅ Uses real-time market data from Upstox API for realistic
                simulation
              </li>
            </ul>

            <h3>1.2 What MockMarket is NOT:</h3>
            <ul>
              <li>❌ NOT a registered broker-dealer or stock exchange</li>
              <li>❌ NOT a Demat account provider</li>
              <li>❌ NOT an investment advisor or financial planner</li>
              <li>❌ NOT a platform for real money trading</li>
              <li>
                ❌ NOT connected to actual stock exchanges for order execution
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>2. Simulation vs Reality</h2>

            <h3>2.1 Simulation Limitations</h3>
            <p>
              While MockMarket provides a realistic simulation experience, there
              are important differences between simulated and real trading:
            </p>
            <ul>
              <li>
                <strong>No Real Money Risk:</strong> Losses in simulation do not
                affect your real finances
              </li>
              <li>
                <strong>No Emotional Impact:</strong> Real trading involves
                psychological pressure not present in simulation
              </li>
              <li>
                <strong>Perfect Execution:</strong> Simulated orders execute
                instantly; real orders may face delays or partial fills
              </li>
              <li>
                <strong>No Slippage:</strong> Real trades may execute at
                different prices than expected
              </li>
              <li>
                <strong>No Transaction Costs:</strong> Real trading involves
                brokerage fees, taxes, and other costs
              </li>
              <li>
                <strong>Unlimited Virtual Capital:</strong> Real trading is
                limited by your actual financial resources
              </li>
            </ul>

            <h3>2.2 Performance Differences</h3>
            <p>
              <strong>
                Success in simulation does NOT guarantee success in real
                trading.
              </strong>{" "}
              Many traders who perform well in simulation struggle with real
              money due to:
            </p>
            <ul>
              <li>Emotional decision-making under financial pressure</li>
              <li>Impact of transaction costs on profitability</li>
              <li>Market conditions and liquidity constraints</li>
              <li>Risk management becomes critical with real money</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Real-World Trading Risks</h2>
            <p>
              If you decide to engage in REAL trading after learning on
              MockMarket, be aware of these substantial risks:
            </p>

            <h3>3.1 Market Risk</h3>
            <p>
              Stock prices can fluctuate dramatically due to economic
              conditions, political events, market sentiment, and
              company-specific news. You can lose your entire investment.
            </p>

            <h3>3.2 Volatility Risk</h3>
            <p>
              Stock prices can be extremely volatile, especially for small-cap
              stocks. Rapid price movements can result in substantial losses.
            </p>

            <h3>3.3 Liquidity Risk</h3>
            <p>
              Some securities may be difficult to sell quickly at a fair price.
              This can prevent you from exiting positions when desired.
            </p>

            <h3>3.4 Leverage Risk</h3>
            <p>
              Trading on margin or using leveraged products can result in losses
              exceeding your initial investment. Leverage magnifies both gains
              and losses.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Educational Purpose Only</h2>
            <p>MockMarket is designed to help you:</p>
            <ul>
              <li>📚 Learn basic concepts of stock trading</li>
              <li>📊 Understand how to read charts and market data</li>
              <li>💡 Experiment with different trading strategies</li>
              <li>🎯 Practice portfolio management</li>
              <li>📈 Gain familiarity with trading platforms</li>
            </ul>
            <p>
              <strong>
                However, simulation cannot fully prepare you for the
                psychological and financial challenges of real trading.
              </strong>
            </p>
          </section>

          <section className="legal-section">
            <h2>5. No Investment Advice</h2>
            <p>MockMarket does NOT provide:</p>
            <ul>
              <li>❌ Investment recommendations or advice</li>
              <li>❌ Financial planning services</li>
              <li>❌ Tax advice</li>
              <li>❌ Legal advice</li>
              <li>❌ Guarantees of any kind</li>
            </ul>
            <p>
              Any information, analysis, or educational content provided is for
              informational purposes only. Do your own research and consult
              qualified professionals before making real investment decisions.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Before You Trade with Real Money</h2>
            <p>
              If you decide to transition from simulation to real trading, you
              should:
            </p>
            <ul>
              <li>✅ Consult with a qualified financial advisor</li>
              <li>✅ Only invest money you can afford to lose</li>
              <li>✅ Understand all costs (brokerage, taxes, fees)</li>
              <li>✅ Start with small amounts</li>
              <li>✅ Have a clear risk management strategy</li>
              <li>✅ Understand the regulatory environment</li>
              <li>✅ Choose a SEBI-registered broker in India</li>
              <li>✅ Complete KYC requirements properly</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>7. Regulatory Information</h2>
            <p>For REAL trading in India, you must:</p>
            <ul>
              <li>Use SEBI-registered brokers</li>
              <li>Open a Demat account and trading account</li>
              <li>Complete KYC (Know Your Customer) verification</li>
              <li>Comply with tax regulations</li>
              <li>Understand investor protection schemes</li>
            </ul>
            <p>
              <strong>
                MockMarket does NOT provide any of these services.
              </strong>{" "}
              We are purely an educational simulation platform.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Data Accuracy</h2>
            <p>
              While we use real-time market data from Upstox API, we do NOT
              guarantee:
            </p>
            <ul>
              <li>Accuracy of data at all times</li>
              <li>Absence of delays or interruptions</li>
              <li>Completeness of historical data</li>
            </ul>
            <p>
              Market data is provided for simulation and educational purposes
              only.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. No Guarantees</h2>
            <p>
              <strong>
                There are NO guarantees of profit in real trading.
              </strong>{" "}
              Key points:
            </p>
            <ul>
              <li>
                Past performance (simulated or real) does not indicate future
                results
              </li>
              <li>Simulated returns do NOT translate to real-world returns</li>
              <li>Market conditions change constantly</li>
              <li>Every investment carries risk</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>10. Your Responsibility</h2>
            <p>By using MockMarket, you acknowledge that:</p>
            <ul>
              <li>You understand this is a simulation platform only</li>
              <li>
                You will NOT hold MockMarket liable for any real-world trading
                decisions
              </li>
              <li>You are responsible for your own due diligence</li>
              <li>You will seek professional advice before real trading</li>
              <li>
                You understand the differences between simulation and reality
              </li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>11. Additional Resources</h2>
            <p>Before engaging in real trading, educate yourself using:</p>
            <ul>
              <li>SEBI Investor Education: www.investor.sebi.gov.in</li>
              <li>NSE/BSE educational resources</li>
              <li>Financial literacy courses</li>
              <li>Books and publications on investing</li>
              <li>Professional financial advisors</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>12. Questions and Support</h2>
            <p>If you have questions about MockMarket simulation platform:</p>
            <p className="contact-info">
              Email: support@mockmarket.com
              <br />
              Educational Platform: MockMarket
            </p>
          </section>
        </div>

        <div className="legal-footer risk-footer">
          <div className="final-warning">
            <h3>⚠️ Final Reminder</h3>
            <p>
              <strong>
                MockMarket is a SIMULATION PLATFORM for educational purposes
                ONLY.
              </strong>{" "}
              No real money is involved. If you choose to engage in real
              trading, understand that it involves SUBSTANTIAL RISK OF LOSS.
              Only invest money you can afford to lose. Always seek professional
              financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

