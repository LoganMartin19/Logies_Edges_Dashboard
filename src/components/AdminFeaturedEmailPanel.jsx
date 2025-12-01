// src/components/AdminFeaturedEmailPanel.jsx
import React, { useState } from "react";
import { api } from "../api";

export default function AdminFeaturedEmailPanel() {
  const [premiumOnly, setPremiumOnly] = useState(true);
  const [day, setDay] = useState(() => {
    // Default: today in YYYY-MM-DD
    return new Date().toISOString().slice(0, 10);
  });

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const sendEmail = async () => {
    setSending(true);
    setResult(null);

    try {
      const res = await api.post(
        "/api/admin/email/featured-picks",
        null,
        {
          params: {
            day,
            premium_only: premiumOnly,
          },
        }
      );

      setResult({
        ok: true,
        sent: res.data.sent,
        recipients: res.data.recipients,
        picks: res.data.picks,
      });
    } catch (err) {
      console.error(err);
      setResult({
        ok: false,
        error: err?.response?.data?.detail || "Unknown error",
      });
    }

    setSending(false);
  };

  return (
    <div
      style={{
        marginTop: "1.5rem",
        padding: "1rem 1.25rem",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.35)",
        background: "rgba(2,8,20,0.9)",
      }}
    >
      <h3 style={{ marginTop: 0, fontSize: "1rem" }}>
        Email: Featured Picks Digest
      </h3>

      <p style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: 4 }}>
        Send today’s Featured Picks to your users.  
        Use this **after** you’ve attached today’s featured picks in the panel above.
      </p>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        {/* DATE */}
        <div>
          <label style={{ fontSize: "0.8rem", opacity: 0.8 }}>Day</label>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            style={{
              marginTop: 4,
              padding: "6px 10px",
              background: "#0f172a",
              border: "1px solid rgba(148,163,184,0.4)",
              borderRadius: 8,
              color: "#e5e7eb",
              fontSize: "0.85rem",
            }}
          />
        </div>

        {/* PREMIUM ONLY */}
        <div>
          <label style={{ fontSize: "0.8rem", opacity: 0.8 }}>
            Recipients
          </label>
          <select
            value={premiumOnly ? "premium" : "all"}
            onChange={(e) => setPremiumOnly(e.target.value === "premium")}
            style={{
              marginTop: 4,
              padding: "6px 10px",
              background: "#0f172a",
              border: "1px solid rgba(148,163,184,0.4)",
              borderRadius: 8,
              color: "#e5e7eb",
              fontSize: "0.85rem",
            }}
          >
            <option value="premium">Premium Users Only</option>
            <option value="all">All Users</option>
          </select>
        </div>

        <button
          onClick={sendEmail}
          disabled={sending}
          style={{
            marginTop: 20,
            padding: "8px 16px",
            background: sending ? "#475569" : "#22c55e",
            border: "none",
            borderRadius: 999,
            fontSize: "0.9rem",
            fontWeight: 600,
            cursor: sending ? "not-allowed" : "pointer",
            color: sending ? "#cbd5e1" : "#000",
          }}
        >
          {sending ? "Sending…" : "Send Email to Users"}
        </button>
      </div>

      {/* RESULTS */}
      {result && (
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 8,
            background:
              result.ok ? "rgba(34,197,94,0.12)" : "rgba(248,113,113,0.2)",
            border: result.ok
              ? "1px solid rgba(34,197,94,0.4)"
              : "1px solid rgba(248,113,113,0.4)",
            color: result.ok ? "#6ee7b7" : "#fca5a5",
            fontSize: "0.85rem",
          }}
        >
          {result.ok ? (
            <>
              ✅ Sent to <strong>{result.sent}</strong> users  
              (Found {result.recipients} recipients, {result.picks} picks)
            </>
          ) : (
            <>❌ Error: {result.error}</>
          )}
        </div>
      )}
    </div>
  );
}