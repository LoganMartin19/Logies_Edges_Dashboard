// src/pages/PremiumPage.jsx
import React, { useState } from "react";
import { useAuth } from "../components/AuthGate";
import { startPremiumCheckout, fetchBillingPortal } from "../api";

export default function PremiumPage() {
  const { firebaseUser, isPremium, loginWithGoogle } = useAuth();
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");

  const handleUpgradeClick = async () => {
    setError("");
    try {
      // If not logged in, prompt Google login then let them click again
      if (!firebaseUser) {
        await loginWithGoogle();
        return;
      }
      setLoadingCheckout(true);
      const { checkout_url } = await startPremiumCheckout();
      window.location.href = checkout_url;
    } catch (err) {
      console.error(err);
      setError("Something went wrong starting checkout. Please try again.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleManageBilling = async () => {
    setError("");
    try {
      if (!firebaseUser) {
        await loginWithGoogle();
        return;
      }
      setLoadingPortal(true);
      const { url } = await fetchBillingPortal();
      window.location.href = url;
    } catch (err) {
      console.error(err);
      setError("Unable to open billing portal. Please try again.");
    } finally {
      setLoadingPortal(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at top, #111827 0, #020617 45%, #000000 100%)",
        color: "#e5e7eb",
        padding: "3rem 1.5rem",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "960px" }}>
        {/* Header */}
        <header style={{ marginBottom: "2.5rem" }}>
          <h1
            style={{
              fontSize: "2.4rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              marginBottom: "0.5rem",
            }}
          >
            CSB Premium
          </h1>
          <p style={{ color: "#9ca3af", maxWidth: "640px" }}>
            Unlock full access to model edges, premium tipster picks, and deeper stats across football and other sports.
          </p>
        </header>

        {/* Status pill */}
        {firebaseUser ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              backgroundColor: "rgba(15, 23, 42, 0.7)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "999px",
                marginRight: 8,
                backgroundColor: isPremium ? "#22c55e" : "#facc15",
              }}
            />
            {isPremium
              ? `You’re on CSB Premium.`
              : `Signed in as ${firebaseUser.email || "your account"} – not Premium yet.`}
          </div>
        ) : (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.85rem",
              marginBottom: "1.5rem",
              border: "1px solid rgba(148, 163, 184, 0.3)",
              backgroundColor: "rgba(15, 23, 42, 0.7)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "999px",
                marginRight: 8,
                backgroundColor: "#f97316",
              }}
            />
            You’re browsing as a guest – log in to upgrade.
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.4fr)",
            gap: "2rem",
            alignItems: "flex-start",
          }}
        >
          {/* Left: feature list */}
          <section
            style={{
              borderRadius: "1rem",
              padding: "1.75rem",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.9))",
              border: "1px solid rgba(148, 163, 184, 0.35)",
            }}
          >
            <h2
              style={{
                fontSize: "1.4rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              What you get with Premium
            </h2>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gap: "0.8rem",
              }}
            >
              <li>
                <strong>Full model access</strong> — see all CSB model edges across supported leagues, not just
                the public shortlist.
              </li>
              <li>
                <strong>More featured picks</strong> — 3–5 free picks for guests, up to 10+ for Premium each day
                (where available).
              </li>
              <li>
                <strong>Premium-only tipster picks</strong> — creators can mark high-conviction selections as
                Premium; you’ll see everything they publish.
              </li>
              <li>
                <strong>Advanced stats & player props</strong> — deeper stats tables and player props edges
                (shots, SOT, cards) as we roll them out.
              </li>
              <li>
                <strong>Multi-sport coverage</strong> — football first, then NFL, NBA, UFC, and more as the platform
                grows.
              </li>
              <li>
                <strong>Priority roadmap</strong> — Premium subscribers directly shape features (watchalongs, chat
                rooms, tools).
              </li>
            </ul>

            <div style={{ marginTop: "1.5rem", fontSize: "0.85rem", color: "#9ca3af" }}>
              Cancel anytime. No long-term contracts. Pricing and benefits may evolve as CSB grows.
            </div>
          </section>

          {/* Right: pricing card */}
          <aside
            style={{
              borderRadius: "1rem",
              padding: "1.75rem",
              background:
                "linear-gradient(145deg, rgba(24, 35, 63, 0.98), rgba(8, 47, 73, 0.98))",
              border: "1px solid rgba(56, 189, 248, 0.5)",
              boxShadow: "0 18px 45px rgba(15,23,42,0.8)",
            }}
          >
            <h2
              style={{
                fontSize: "1.3rem",
                fontWeight: 600,
                marginBottom: "0.4rem",
              }}
            >
              Premium Plan
            </h2>
            <p style={{ color: "#cbd5f5", marginBottom: "1rem", fontSize: "0.95rem" }}>
              Designed for serious bettors who want creator insight + model edges in one place.
            </p>

            <div style={{ display: "flex", alignItems: "baseline", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "2.3rem", fontWeight: 700 }}>£9.99</span>
              <span style={{ marginLeft: 6, fontSize: "0.9rem", color: "#e5e7eb" }}>/month</span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "#d1d5db", marginBottom: "1.5rem" }}>
              Introductory pricing. We’ll keep existing subscribers on their rate as we grow.
            </div>

            {/* Action buttons */}
            {!isPremium ? (
              <button
                onClick={handleUpgradeClick}
                disabled={loadingCheckout}
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  background:
                    "linear-gradient(135deg, #22c55e, #16a34a)",
                  color: "#020617",
                  marginBottom: "0.75rem",
                  opacity: loadingCheckout ? 0.8 : 1,
                }}
              >
                {firebaseUser
                  ? loadingCheckout
                    ? "Starting checkout…"
                    : "Upgrade to Premium"
                  : "Sign in & upgrade"}
              </button>
            ) : (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(52, 211, 153, 0.5)",
                  fontSize: "0.9rem",
                  marginBottom: "0.75rem",
                }}
              >
                ✅ You’re on Premium. Thanks for backing CSB early.
              </div>
            )}

            <button
              onClick={handleManageBilling}
              disabled={loadingPortal}
              style={{
                width: "100%",
                padding: "0.7rem 1rem",
                borderRadius: "999px",
                border: "1px solid rgba(148, 163, 184, 0.6)",
                backgroundColor: "transparent",
                color: "#e5e7eb",
                fontSize: "0.9rem",
                cursor: "pointer",
                opacity: loadingPortal ? 0.8 : 1,
              }}
            >
              {loadingPortal ? "Opening billing…" : "Manage subscription"}
            </button>

            {error && (
              <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#fecaca" }}>
                {error}
              </p>
            )}

            <div
              style={{
                marginTop: "1.5rem",
                fontSize: "0.8rem",
                color: "#9ca3af",
                borderTop: "1px solid rgba(148, 163, 184, 0.3)",
                paddingTop: "0.75rem",
              }}
            >
              Premium content is for information only and not financial advice. Always bet responsibly.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}