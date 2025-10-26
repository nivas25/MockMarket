"use client";

import Image from "next/image";
import Rabbit from "../../../public/rabbit/Rabbit_Namaste.png";
import { useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios"; // <-- Axios import

export default function HeroSection() {
  useEffect(() => {
    const handleScroll = () => {
      document.body.classList.toggle("scrolled", window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Google Login function using the hook
  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      console.log(
        "Google login success, sending code to backend:",
        codeResponse
      );
      console.log("Google auth code (codeResponse.code):", codeResponse?.code);

      try {
        // Axios POST request to backend
        const response = await axios.post(
          "http://localhost:5000/auth/google-login", // Your backend endpoint
          { code: codeResponse.code }, // Body payload
          { headers: { "Content-Type": "application/json" } }
        );

        console.log("Backend HTTP status:", response.status);
        console.log("Backend response data:", response.data);

        const jwtToken = response.data?.token; // Extract JWT from backend response

        if (jwtToken) {
          console.log("Received JWT from backend:", jwtToken);
          localStorage.setItem("authToken", jwtToken);

          // Redirect to dashboard
          window.location.href = "/dashboard";
        } else {
          console.error(
            "Backend response missing token — full response:",
            response
          );
          // If backend returned an empty object, show status for debugging
          if (response && Object.keys(response.data || {}).length === 0) {
            alert(
              `Login failed: Backend returned empty response (status ${response.status}). Check server logs and CORS.`
            );
          } else {
            alert("Login failed: Could not retrieve session token.");
          }
        }
      } catch (error: unknown) {
        // Axios error handling — be verbose so we can debug empty bodies / CORS / network issues
        if (axios.isAxiosError(error)) {
          if (error.response) {
            console.error(
              "Backend login failed — status:",
              error.response.status
            );
            console.error(
              "Backend login failed — headers:",
              error.response.headers
            );
            console.error("Backend login failed — data:", error.response.data);
            const dataUnknown = error.response.data as unknown;
            let errMsg = "Unknown error";
            if (
              dataUnknown &&
              typeof dataUnknown === "object" &&
              "message" in dataUnknown
            ) {
              const maybeMsg = (dataUnknown as { message?: unknown }).message;
              errMsg =
                typeof maybeMsg === "string" ? maybeMsg : "Unknown error";
            }
            alert(`Login failed: ${errMsg} (status ${error.response.status})`);
          } else if (error.request) {
            // Request was made but no response received
            console.error(
              "No response received from backend (possible CORS or network issue):",
              error.request
            );
            alert(
              "Login failed: No response from server. Check backend is running and CORS is configured."
            );
          } else {
            console.error("Error creating request:", error.message);
            alert("Login failed: Could not create request.");
          }
        } else {
          console.error("Unexpected error communicating with backend:", error);
          alert("Login failed: An unexpected error occurred.");
        }
      }
    },
    onError: (errorResponse) => {
      console.error("Google login failed:", errorResponse);
      alert("Google login failed. Please try again.");
    },
  });

  const handleGoogleLogin = () => {
    googleLogin(); // Open Google popup
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
