// src/pages/AdminPage.jsx
import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../components/AuthGate";
import AdminPicks from "./AdminPicks"; // featured picks UI
import AdminAddAcca from "./AdminAddAcca"; // acca builder page
import AdminTipsterApplications from "./AdminTipsterApplications"; // ✅ NEW

export default function AdminPage() {
  const nav = useNavigate();
  const { firebaseUser, profile, isAdmin, loading, logout } = useAuth();

  // Gate access: only admins allowed
  useEffect(() => {
    if (loading) return;

    // Not logged in → send to login
    if (!firebaseUser || !profile) {
      nav("/login");
      return;
    }

    // Logged in but not admin → send home
    if (!isAdmin) {
      nav("/");
    }
  }, [loading, firebaseUser, profile, isAdmin, nav]);

  // While auth/profile is loading, or redirecting
  if (loading || !firebaseUser || !profile || !isAdmin) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020814",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.95rem",
        }}
      >
        Checking admin access…
      </div>
    );
  }

  const email = profile?.email || firebaseUser.email;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #041318 0, #020814 45%, #020308 100%)",
        color: "#e5e7eb",
        padding: "1.5rem",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.8rem",
                letterSpacing: "0.04em",
              }}
            >
              CSB Admin
            </h1>
            <p
              style={{
                margin: "0.25rem 0 0",
                fontSize: "0.9rem",
                color: "#9ca3af",
              }}
            >
              Signed in as <strong>{email}</strong> • Admin console
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link
              to="/"
              style={{
                fontSize: "0.85rem",
                padding: "0.4rem 0.8rem",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.5)",
                textDecoration: "none",
                color: "#e5e7eb",
              }}
            >
              ← Back to site
            </Link>
            <button
              onClick={logout}
              style={{
                fontSize: "0.85rem",
                padding: "0.4rem 0.9rem",
                borderRadius: 999,
                border: "1px solid rgba(248,113,113,0.7)",
                background: "transparent",
                color: "#fecaca",
                cursor: "pointer",
              }}
            >
              Log out
            </button>
          </div>
        </header>

        {/* Summary / nav strip for future sections */}
        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.5)",
              background: "rgba(15,23,42,0.7)",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ opacity: 0.8, marginBottom: 4 }}>Admin sections</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(34,197,94,0.7)",
                  fontSize: "0.78rem",
                  background: "rgba(22,163,74,0.12)",
                }}
              >
                Featured Picks
              </span>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(59,130,246,0.7)",
                  fontSize: "0.78rem",
                  background: "rgba(37,99,235,0.12)",
                }}
              >
                Acca Builder
              </span>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(249,115,22,0.7)",
                  fontSize: "0.78rem",
                  background: "rgba(194,65,12,0.18)",
                }}
              >
                Tipster applications
              </span>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.4)",
                  fontSize: "0.78rem",
                  opacity: 0.7,
                }}
              >
                Stripe / payouts (soon)
              </span>
            </div>
          </div>
        </section>

        {/* Featured Picks */}
        <section
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(15,23,42,0.85)",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "0.75rem",
              fontSize: "1.1rem",
            }}
          >
            Featured Picks & Fixtures
          </h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: "1rem",
              fontSize: "0.85rem",
              color: "#9ca3af",
            }}
          >
            Use this panel to attach “Featured Picks” to today&apos;s fixtures.
            These show up on the public dashboard and in your marketing posts.
          </p>

          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              background: "#020814",
            }}
          >
            <AdminPicks />
          </div>
        </section>

        {/* Acca Builder */}
        <section
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(15,23,42,0.85)",
            padding: "1rem 1.25rem",
            marginBottom: "1.25rem",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "0.75rem",
              fontSize: "1.1rem",
            }}
          >
            Acca Builder
          </h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: "1rem",
              fontSize: "0.85rem",
              color: "#9ca3af",
            }}
          >
            Build multi-leg accumulators combining match markets and player
            props. These are posted as curated CSB accas via the admin API.
          </p>

          <div
            style={{
              borderRadius: 12,
              overflow: "hidden",
              background: "#020814",
            }}
          >
            <AdminAddAcca />
          </div>
        </section>

        {/* Tipster Applications */}
        <section
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(15,23,42,0.85)",
            padding: "1rem 1.25rem",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "0.75rem",
              fontSize: "1.1rem",
            }}
          >
            Tipster applications
          </h2>
          <p
            style={{
              marginTop: 0,
              marginBottom: "0.75rem",
              fontSize: "0.85rem",
              color: "#9ca3af",
            }}
          >
            Review new tipster applications and approve them to automatically
            create verified tipster profiles.
          </p>

          <AdminTipsterApplications />
        </section>
      </div>
    </div>
  );
}