// src/pages/AccountPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthGate";
import { auth } from "../firebase";
import { updateProfile } from "firebase/auth";
import { fetchMyTipster } from "../api";
import styles from "../styles/Auth.module.css";

// small helpers for stats
const number = (x, d = 2) =>
  typeof x === "number" && isFinite(x) ? x.toFixed(d) : "—";
const percent = (x, d = 1) =>
  typeof x === "number" && isFinite(x) ? (x * 100).toFixed(d) : "—";

export default function AccountPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [myTipster, setMyTipster] = useState(null);
  const [loadingTipster, setLoadingTipster] = useState(true);

  // Populate form from Firebase user
  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || "");
    setAvatarUrl(user.photoURL || "");
  }, [user]);

  // Load tipster profile (if any)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const t = await fetchMyTipster();
        if (!cancelled) setMyTipster(t);
      } catch {
        if (!cancelled) setMyTipster(null);
      } finally {
        if (!cancelled) setLoadingTipster(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.title}>Profile &amp; Settings</div>
            <div className={styles.subtitle}>Please log in to manage your account.</div>
          </div>
          <Link to="/login" className={styles.btn}>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      if (!auth.currentUser) throw new Error("No authenticated user found");

      await updateProfile(auth.currentUser, {
        displayName: displayName || null,
        photoURL: avatarUrl || null,
      });

      // Optional: refresh user object
      if (auth.currentUser.reload) {
        await auth.currentUser.reload();
      }

      setMessage("Profile updated ✅");
    } catch (err) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initial =
    (user.displayName && user.displayName[0]) ||
    (user.email && user.email[0]) ||
    "U";

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.title}>Profile &amp; Settings</div>
          <div className={styles.subtitle}>
            Manage your CSB account details. More personalisation and follow
            features coming soon.
          </div>
        </header>

        {/* Current user summary */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName || user.email}
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
              }}
            >
              {initial.toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600 }}>
              {displayName || user.displayName || "(no name set)"}
            </div>
            <div style={{ fontSize: 13, opacity: 0.8 }}>{user.email}</div>
          </div>
        </div>

        {/* Profile edit form */}
        <form className={styles.form} onSubmit={handleSave}>
          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.success}>{message}</div>}

          <div className={styles.row}>
            <label className={styles.label}>Display name</label>
            <input
              className={styles.input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How you appear around CSB"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Avatar URL</label>
            <input
              className={styles.input}
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://… (optional)"
            />
            <div className={styles.hint}>
              Leave blank to use your initial instead of a picture.
            </div>
          </div>

          {/* future settings */}
          <div className={styles.row}>
            <label className={styles.label}>Coming soon</label>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: 13 }}>
              <li>Favourite sports &amp; leagues</li>
              <li>Notification &amp; email alert preferences</li>
              <li>Followed tipsters &amp; social features</li>
            </ul>
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        {/* Tipster section */}
        <hr
          style={{
            border: 0,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            margin: "24px 0 16px",
          }}
        />

        <div style={{ fontWeight: 600, marginBottom: 8 }}>Tipster profile</div>

        {loadingTipster ? (
          <div style={{ fontSize: 14, opacity: 0.8 }}>Loading…</div>
        ) : myTipster ? (
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              {myTipster.name} @{myTipster.username}
            </div>
            <div style={{ fontSize: 13, marginBottom: 8, opacity: 0.85 }}>
              30D stats: ROI {percent(myTipster.roi_30d)}%, Profit{" "}
              {number(myTipster.profit_30d)}, Picks {myTipster.picks_30d}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => nav(`/tipsters/${myTipster.username}`)}
              >
                View public page
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => nav(`/tipsters/${myTipster.username}/edit`)}
              >
                Edit tipster profile
              </button>
            </div>
            <p className={styles.hint} style={{ marginTop: 8 }}>
              Followers &amp; following will appear here once we roll out the social
              layer.
            </p>
          </div>
        ) : (
          <div style={{ fontSize: 14, opacity: 0.9 }}>
            You don’t have a tipster profile yet.
            <br />
            <Link to="/tipsters/apply" style={{ color: "#6ee7b7" }}>
              Apply to become a verified tipster.
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}