// src/pages/AdminPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../components/AuthGate";
import AdminPicks from "./AdminPicks";
import AdminAddAcca from "./AdminAddAcca";
import AdminTipsterApplications from "./AdminTipsterApplications";

export default function AdminPage() {
  const nav = useNavigate();
  const { firebaseUser, profile, isAdmin, loading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("featured"); // "featured" | "accas" | "tipsters"

  // Gate access: only admins allowed
  useEffect(() => {
    if (loading) return;

    if (!firebaseUser || !profile) {
      nav("/login");
      return;
    }

    if (!isAdmin) {
      nav("/");
    }
  }, [loading, firebaseUser, profile, isAdmin, nav]);

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

  const tabChipStyle = (tab) => ({
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: "0.78rem",
    cursor: "pointer",
    border:
      activeTab === tab
        ? "1px solid rgba(255,255,255,0.9)"
        : "1px solid rgba(148,163,184,0.5)",
    background:
      activeTab === tab
        ? "rgba(15,23,42,0.95)"
        : "rgba(15,23,42,0.4)",
    color: activeTab === tab ? "#f9fafb" : "#e5e7eb",
  });

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

        {/* Tabs */}
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
              width: "100%",
            }}
          >
            <div style={{ opacity: 0.8, marginBottom: 4 }}>Admin sections</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={tabChipStyle("featured")}
                onClick={() => setActiveTab("featured")}
              >
                Featured Picks
              </button>
              <button
                type="button"
                style={tabChipStyle("accas")}
                onClick={() => setActiveTab("accas")}
              >
                Acca Builder
              </button>
              <button
                type="button"
                style={tabChipStyle("tipsters")}
                onClick={() => setActiveTab("tipsters")}
              >
                Tipster applications
              </button>
            </div>
          </div>
        </section>

        {/* Active tab content */}
        {activeTab === "featured" && (
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
        )}

        {activeTab === "accas" && (
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
        )}

        {activeTab === "tipsters" && (
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
                marginBottom: "1rem",
                fontSize: "0.85rem",
                color: "#9ca3af",
              }}
            >
              Review new tipster applications and approve them to automatically
              create verified tipster profiles.
            </p>

            <AdminTipsterApplications />
          </section>
        )}
      </div>
    </div>
  );
}