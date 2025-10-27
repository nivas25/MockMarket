"use client";

import Image from "next/image";
import Rabbit from "../../../public/rabbit/Rabbit_Namaste.png";
import { useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { url } from "../../config";

export default function HeroSection() {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const verifyingRef = useRef(false); // ✅ prevent duplicate requests

  useEffect(() => {
    const verifyUser = async () => {
      // ✅ prevent multiple calls
      if (verifyingRef.current) return;
      verifyingRef.current = true;

      try {
        const token = localStorage.getItem("authToken");

        if (!token) {
          console.log("⚠️ No token found — staying on home.");
          setIsVerified(false);
          return;
        }

        const res = await axios.get(`${url}/user/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.valid) {
          console.log("✅ User verified successfully");
          setIsVerified(true);

          // ✅ redirect only once
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 500);
        } else {
          console.warn("❌ Invalid user token");
          localStorage.removeItem("authToken");
          setIsVerified(false);
        }
      } catch (err) {
        console.error("User verification failed:", err);
        localStorage.removeItem("authToken");
        setIsVerified(false);
      }
    };

    verifyUser();

    const handleScroll = () => {
      document.body.classList.toggle("scrolled", window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Google Login
  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: async (codeResponse) => {
      try {
        const response = await axios.post(
          `${url}/auth/google-login`,
          { code: codeResponse.code },
          { headers: { "Content-Type": "application/json" } }
        );

        const jwtToken = response.data?.token;

        if (jwtToken) {
          localStorage.setItem("authToken", jwtToken);
          window.location.href = "/dashboard";
        } else {
          alert("Login failed: No token received.");
        }
      } catch (error: any) {
        console.error("Login error:", error);
        alert("Login failed. Please try again.");
      }
    },
    onError: () => {
      alert("Google login failed. Please try again.");
    },
  });

  const handleGoogleLogin = () => {
    googleLogin();
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
            Practice trading with real market data and zero loss. MockMarket helps you learn,
            invest, and grow confidently.
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
