"use client";

import React from "react";
import { useRouter } from "next/navigation";
import "./Error.css";

export default function Error404Page() {
  const router = useRouter();

  return (
    <div className="error-page">
      <h1>Un-authorized access</h1>
      <p
        className="redirect-text"
        onClick={() => router.push("/")}
      >
        Please login again to kick-start →
      </p>
    </div>
  );
}
