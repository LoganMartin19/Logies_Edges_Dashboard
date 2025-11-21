// src/pages/PremiumPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../components/AuthGate";
import {
  startPremiumCheckout,
  fetchBillingPortal,
  fetchBillingStatus,
} from "../api";

export default function PremiumPage() {
  const {
    firebaseUser,
    isPremium,
    loginWithGoogle,
    updatePremiumStatus, // <-- added in AuthGate
  } = useAuth();

  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState("");

  // Ask backend on page load whether this user is premium
  useEffect(() => {
    if (!firebaseUser) return;

    (async () => {
      try {
        const data = await fetchBillingStatus(); // GET /api/billing/status
        // Safely update the auth context if helper exists
        updatePremiumStatus?.(data.is_premium);
      } catch (err) {
        console.error("Billing status fetch failed:", err);
      }
    })();
  }, [firebaseUser, updatePremiumStatus]);

  const handleUpgradeClick = async () => {
    setError("");
    try {
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
        background:
          "radial-gradient(circle at top, #04210F 0, #020B06 45%, #020308 100%)",
        color: "#E5E7EB",
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
          <p style={{ color: "#9CA3AF", maxWidth: "640px" }}>
            Unlock full access to CSB model edges, extra featured picks, and
            deeper stats across football and other sports.
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
              border: "1px solid rgba(148, 163, 184, 0.35)",
              backgroundColor: "rgba(3, 20, 12, 0.85)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "999px",
                marginRight: 8,
                backgroundColor: isPremium ? "#22C55E" : "#FACC15",
              }}
            />
            {isPremium
              ? "You’re on CSB Premium."
              : `Signed in as ${
                  firebaseUser.email || "your account"
                } – not Premium yet.`}
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
              border: "1px solid rgba(148, 163, 184, 0.35)",
              backgroundColor: "rgba(3, 20, 12, 0.85)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: "999px",
                marginRight: 8,
                backgroundColor: "#F97316",
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
                "linear-gradient(135deg, rgba(4, 33, 15, 0.96), rgba(2, 20, 10, 0.96))",
              border: "1px solid rgba(34, 197, 94, 0.45)",
              boxShadow: "0 14px 40px rgba(0, 0, 0, 0.6)",
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
                fontSize: "0.95rem",
              }}
            >
              <li>
                <strong>Full model access</strong> — see all CSB model edges
                across supported leagues, not just the public shortlist.
              </li>
              <li>
                <strong>More featured picks</strong> —{" "}
                <span style={{ color: "#BBF7D0" }}>3–5 free picks</span> for
                guests, up to{" "}
                <span style={{ color: "#BBF7D0" }}>10+ Premium picks</span> each
                day where available.
              </li>
              <li>
                <strong>Premium-only creator picks</strong> — tipsters can mark
                high-conviction selections as Premium; you’ll see everything
                they publish to Premium followers.
              </li>
              <li>
                <strong>Advanced stats & player props</strong> — deeper stats
                tables and player props edges (shots, SOT, cards) as we roll
                them out.
              </li>
              <li>
                <strong>Multi-sport coverage</strong> — football first, then
                NFL, NBA, NHL and more as the platform grows.
              </li>
              <li>
                <strong>Priority roadmap</strong> — Premium subscribers have
                first say on new tools, watchalongs and features.
              </li>
              <li>
                <strong>Monthly tipster giveaway</strong> — every month we pick
                one Premium member at random to get{" "}
                <span style={{ color: "#BBF7D0" }}>
                  a free month of access to the previous month’s top-performing
                  tipster
                </span>{" "}
                (based on CSB tracked results).
              </li>
            </ul>

            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "0.9rem",
                borderTop: "1px dashed rgba(148, 163, 184, 0.5)",
                fontSize: "0.85rem",
                color: "#9CA3AF",
              }}
            >
              <strong>Tipster subscriptions</strong> — CSB Premium covers the
              model and core tools. Individual tipsters can still charge their
              own subscription fees; those payments go directly to the creator
              (minus processing fees).
            </div>

            <div
              style={{
                marginTop: "0.75rem",
                fontSize: "0.8rem",
                color: "#9CA3AF",
              }}
            >
              Cancel anytime. No long-term contracts. Pricing and benefits may
              evolve as CSB grows.
            </div>
          </section>

          {/* Right: pricing card */}
          <aside
            style={{
              borderRadius: "1rem",
              padding: "1.75rem",
              background: "linear-gradient(145deg, #0F5132, #0B3D2E)",
              border: "1px solid rgba(34, 197, 94, 0.6)",
              boxShadow: "0 18px 45px rgba(0, 0, 0, 0.75)",
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
            <p
              style={{
                color: "#E5F9ED",
                marginBottom: "1rem",
                fontSize: "0.95rem",
              }}
            >
              Built for bettors who want model edges and creator insight in one
              place.
            </p>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                marginBottom: "0.75rem",
              }}
            >
              <span style={{ fontSize: "2.3rem", fontWeight: 700 }}>£9.99</span>
              <span
                style={{
                  marginLeft: 6,
                  fontSize: "0.9rem",
                  color: "#E5E7EB",
                }}
              >
                /month
              </span>
            </div>
            <div
              style={{
                fontSize: "0.85rem",
                color: "#E5F9ED",
                marginBottom: "1.5rem",
              }}
            >
              Introductory pricing for early members. Existing subscribers keep
              their rate as CSB grows.
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
                  background: "linear-gradient(135deg, #22C55E, #16A34A)",
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
                  backgroundColor: "rgba(3, 20, 12, 0.9)",
                  border: "1px solid rgba(34, 197, 94, 0.7)",
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
                border: "1px solid rgba(209, 213, 219, 0.6)",
                backgroundColor: "transparent",
                color: "#F9FAFB",
                fontSize: "0.9rem",
                cursor: "pointer",
                opacity: loadingPortal ? 0.8 : 1,
              }}
            >
              {loadingPortal ? "Opening billing…" : "Manage subscription"}
            </button>

            {error && (
              <p
                style={{
                  marginTop: "0.75rem",
                  fontSize: "0.85rem",
                  color: "#FECACA",
                }}
              >
                {error}
              </p>
            )}

            <div
              style={{
                marginTop: "1.5rem",
                fontSize: "0.8rem",
                color: "#D1D5DB",
                borderTop: "1px solid rgba(209, 213, 219, 0.35)",
                paddingTop: "0.75rem",
              }}
            >
              Premium content is for information only and not financial advice.
              Always bet responsibly.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}