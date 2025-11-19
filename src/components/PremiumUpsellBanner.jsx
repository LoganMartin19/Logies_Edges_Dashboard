// src/components/PremiumUpsellBanner.jsx
import React from "react";
import { useAuth } from "./AuthGate";
import { startPremiumCheckout } from "../api";

export default function PremiumUpsellBanner({
  message = "Unlock full CSB model edges, premium tipster picks, and deeper stats with CSB Premium.",
}) {
  const { firebaseUser, isPremium, loginWithGoogle } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  if (isPremium) return null; // don’t show to premium users

  const handleClick = async () => {
    setError("");
    try {
      if (!firebaseUser) {
        await loginWithGoogle();
        return;
      }
      setLoading(true);
      const { checkout_url } = await startPremiumCheckout();
      window.location.href = checkout_url;
    } catch (err) {
      console.error(err);
      setError("Couldn’t start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: "0.75rem",
        padding: "0.9rem 1rem",
        margin: "1rem 0",
        background:
          "linear-gradient(135deg, rgba(30,64,175,0.95), rgba(17,24,39,0.95))",
        border: "1px solid rgba(129, 140, 248, 0.7)",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        color: "#e5e7eb",
        fontSize: "0.9rem",
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>CSB Premium</div>
        <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>{message}</div>
      </div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          padding: "0.55rem 0.9rem",
          borderRadius: "999px",
          border: "none",
          cursor: "pointer",
          background: "linear-gradient(135deg, #22c55e, #16a34a)",
          color: "#020617",
          fontWeight: 600,
          fontSize: "0.85rem",
          whiteSpace: "nowrap",
        }}
      >
        {firebaseUser
          ? loading
            ? "Loading…"
            : "Upgrade"
          : "Sign in & upgrade"}
      </button>
      {error && (
        <div style={{ fontSize: "0.75rem", color: "#fecaca", marginLeft: "0.75rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}