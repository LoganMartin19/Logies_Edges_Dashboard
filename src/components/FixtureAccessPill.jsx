// File: src/components/FixtureAccessPill.jsx
import React from "react";
import { Link } from "react-router-dom";

const pillBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  borderWidth: 1,
  borderStyle: "solid",
  whiteSpace: "nowrap",
};

export default function FixtureAccessPill({ meta, fixtureId, variant = "default" }) {
  // ⭐ Compact mode: we don’t show meta; we just provide a neutral “View edges” pill
  if (variant === "compact") {
    return (
      <Link
        to={`/fixture/${fixtureId}`}
        style={{ textDecoration: "none" }}
      >
        <span
          style={{
            ...pillBase,
            padding: "3px 8px",
            fontSize: 10,
            background: "#F5F9F7",
            color: "#0E5C3C",
            borderColor: "#C1A464",
          }}
        >
          📊 View edges
        </span>
      </Link>
    );
  }

  // ⭐ Default variant for FixturePage
  if (!meta) return null;

  const { isPremium, hasFullAccess, usedToday = 0, limit = 0, isTeaser } = meta;

  // --- Premium: green + gold star ------------------------------------------
  if (isPremium) {
    return (
      <span
        style={{
          ...pillBase,
          background: "#0E5C3C",
          color: "#fff",
          borderColor: "rgba(255,255,255,0.3)",
        }}
      >
        ⭐ CSB Premium
      </span>
    );
  }

  // --- Free user with full unlock ------------------------------------------
  if (hasFullAccess && !isTeaser) {
    return (
      <span
        style={{
          ...pillBase,
          background: "#F5F9F7",
          color: "#0E5C3C",
          borderColor: "#C1A464",
        }}
      >
        ✅ Fixture unlocked{" "}
        <span style={{ opacity: 0.85 }}>({usedToday}/{limit || "∞"} today)</span>
      </span>
    );
  }

  // --- Free user over limit → teaser ----------------------------------------
  return (
    <span
      style={{
        ...pillBase,
        background: "#FFF7E6",
        color: "#8A5A00",
        borderColor: "#FBBF24",
      }}
    >
      🔒 Free preview{" "}
      <span style={{ opacity: 0.85 }}>
        ({usedToday}/{limit || "∞"} today)
      </span>
      <Link
        to="/premium"
        style={{
          marginLeft: 6,
          textDecoration: "underline",
          color: "#C08A00",
          fontWeight: 700,
        }}
      >
        Go Premium
      </Link>
    </span>
  );
}