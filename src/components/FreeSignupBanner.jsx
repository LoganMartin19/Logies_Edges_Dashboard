// src/components/FreeSignupBanner.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

export default function FreeSignupBanner() {
  const nav = useNavigate();

  return (
    <div
      style={{
        background: "#0b1e13",
        borderRadius: 18,
        padding: 16,
        marginBottom: 12,
        border: "1px solid rgba(255,255,255,.10)",
        boxShadow: "0 8px 20px rgba(0,0,0,.10)",
        color: "#fff",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
        Follow CSB for free
      </div>

      <div style={{ fontSize: 13, color: "rgba(255,255,255,.80)", marginBottom: 10 }}>
        Create a free account to access dashboards, track performance, and follow featured picks.
        No card required.
      </div>

      <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.85)" }}>✔ View today’s model edges</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.85)" }}>✔ Track picks & performance</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,.85)" }}>✔ Follow tipsters</div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => nav("/signup")}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            background: "#22c55e",
            color: "#0b1e13",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Create free account
        </button>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,.65)" }}>
          Free plan · Upgrade to Premium anytime
        </div>
      </div>
    </div>
  );
}