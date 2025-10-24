"use client";

import Image from "next/image";
import Rabbit from "../../../public/rabbit/Rabbit_Namaste.png";
import { useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google"; // 1. Import the hook

export default function HeroSection() {
  useEffect(() => {
    const handleScroll = () => {
      document.body.classList.toggle("scrolled", window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 2. The login function using the hook
  const googleLogin = useGoogleLogin({
    // This uses the 'Authorization Code Flow' which is more secure
    // Google gives us a one-time code, we send it to YOUR backend
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      console.log(
        "Google login success, sending code to backend:",
        codeResponse
      );
      try {
        // 3. Send the code to YOUR backend
        const response = await fetch(
          // ---
          // --- FIX: Use the full URL to your Flask backend ---
          // ---
          "http://:5001/api/v1/auth/google-login", // YOUR backend endpoint
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code: codeResponse.code }), // Send the code
          }
        );

        if (!response.ok) {
          // Handle backend errors (e.g., user not found, server issue)
          const errorData = await response.json();
          console.error("Backend login failed:", errorData);
          alert(`Login failed: ${errorData.message || "Unknown error"}`);
          return;
        }

        // 4. Get YOUR JWT from the backend response
        const data = await response.json();
        const jwtToken = data.token; // Assuming your backend sends { "token": "YOUR_JWT" }

        if (jwtToken) {
          console.log("Received JWT from backend:", jwtToken);
          // 5. Save the JWT
          localStorage.setItem("authToken", jwtToken);

          // 6. Redirect to the dashboard
          window.location.href = "/dashboard"; // Simple redirect for now
        } else {
          console.error("Backend response missing token");
          alert("Login failed: Could not retrieve session token.");
        }
      } catch (error) {
        console.error("Error communicating with backend:", error);
        alert("Login failed: Could not connect to server.");
      }
    },
    onError: (errorResponse) => {
      console.error("Google login failed:", errorResponse);
      alert("Google login failed. Please try again.");
    },
  });

  // Function to call when the button is clicked
  const handleGoogleLogin = () => {
    googleLogin(); // This opens the Google popup
  };

  return (
    <section className="hero">
      <div className="sticky-header">
        <div className="header-badge">
          <span className="header-logo">MockMarket</span>
        </div>
      </div>

      <div className="hero-main-content">
        <div className="hero-content">
          <h1 className="hero-title">
            Trade Smart.
            <br />
            <span className="hero-title-gold">Risk None.</span>
          </h1>
          <p className="hero-subtext">
            Practice trading with real market data and zero loss. MockMarket
            helps you learn, invest, and grow confidently.
          </p>
          <div className="hero-buttons">
            {/* --- 7. UPDATE THE BUTTON --- */}
            {/* Change back to <button> and add onClick */}
            <button className="btn-primary" onClick={handleGoogleLogin}>
              Start Trading
            </button>
            <a href="#features" className="btn-secondary">
              Learn More
            </a>
          </div>
        </div>

        <div className="hero-image">
          <Image
            src={Rabbit}
            alt="MockMarket Mascot"
            priority
            className="rabbit"
            quality={100}
          />
        </div>
      </div>
    </section>
  );
}
