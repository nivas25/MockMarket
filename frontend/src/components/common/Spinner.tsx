"use client";

import React from "react";

type SpinnerProps = {
  size?: number;
  color?: string;
  label?: string;
};

export default function Spinner({
  size = 24,
  color = "#555",
  label,
}: SpinnerProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    border: `${Math.max(2, Math.floor(size / 8))}px solid #e5e7eb`,
    borderTopColor: color,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <div style={style} />
      {label ? <span style={{ color, fontSize: 14 }}>{label}</span> : null}
      <style>
        {`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}
