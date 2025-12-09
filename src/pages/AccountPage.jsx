// src/pages/AccountPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthGate";
import { auth } from "../firebase";
import { updateProfile } from "firebase/auth";
import {
  fetchMyTipster,
  api,
  fetchCurrentUser,
  updateEmailPreferences,
} from "../api";
import styles from "../styles/Auth.module.css";
import { usePreferences } from "../context/PreferencesContext"; // ⭐ NEW

// small helpers for stats
const number = (x, d = 2) =>
  typeof x === "number" && isFinite(x) ? x.toFixed(d) : "—";
const percent = (x, d = 1) =>
  typeof x === "number" && isFinite(x) ? (x * 100).toFixed(d) : "—";

// VAPID public key from env (set in .env as REACT_APP_VAPID_PUBLIC_KEY)
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

// helper: convert base64 → Uint8Array for Push API
const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Supported sports for favourites
const ALL_SPORTS = ["football", "nba", "nhl", "nfl", "cfb"];

export default function AccountPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const {
    favoriteSports,
    favoriteTeams,
    favoriteLeagues,
    loading: prefsLoading,
    saving: prefsSavingBackend,
    updatePreferences,
  } = usePreferences(); // ⭐ hook into preferences

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [myTipster, setMyTipster] = useState(null);
  const [loadingTipster, setLoadingTipster] = useState(true);

  // 🔔 notification state
  const [notifStatus, setNotifStatus] = useState("");
  const [notifError, setNotifError] = useState("");
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );

  // ✉️ email picks preference
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState("");
  const [prefsError, setPrefsError] = useState("");

  // ⭐ Favourites local editing state
  const [favSportsLocal, setFavSportsLocal] = useState([]);
  const [favTeamsLocal, setFavTeamsLocal] = useState("");
  const [favLeaguesLocal, setFavLeaguesLocal] = useState("");
  const [savingFavs, setSavingFavs] = useState(false);
  const [favsMessage, setFavsMessage] = useState("");
  const [favsError, setFavsError] = useState("");

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

  // Load backend profile (/auth/me) so we can read email_picks_opt_in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const me = await fetchCurrentUser();
        if (!cancelled && me) {
          if (typeof me.email_picks_opt_in !== "undefined") {
            setEmailOptIn(!!me.email_picks_opt_in);
          } else {
            setEmailOptIn(true);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("Failed to load email prefs", e);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // ⭐ Sync local favourites from context once loaded
  useEffect(() => {
    if (prefsLoading) return;
    setFavSportsLocal(favoriteSports || []);
    setFavTeamsLocal((favoriteTeams || []).join(", "));
    setFavLeaguesLocal((favoriteLeagues || []).join(", "));
  }, [prefsLoading, favoriteSports, favoriteTeams, favoriteLeagues]);

  // simple helper for capability check
  const supportsPush =
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.title}>Profile &amp; Settings</div>
            <div className={styles.subtitle}>
              Please log in to manage your account.
            </div>
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

  const handleEnableNotifications = async () => {
    setNotifError("");
    setNotifStatus("");

    try {
      if (!supportsPush) {
        setNotifError(
          "Your browser doesn’t support web push (or service workers aren’t available). Try Chrome or Edge on desktop or Android."
        );
        return;
      }

      if (!VAPID_PUBLIC_KEY) {
        setNotifError(
          "Notifications aren’t fully configured yet (missing VAPID public key). Ask admin (you 😄) to set REACT_APP_VAPID_PUBLIC_KEY."
        );
        return;
      }

      setNotifLoading(true);

      // 1) ask or confirm permission
      let permission = Notification.permission;
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
      setNotifPermission(permission);

      if (permission !== "granted") {
        setNotifError(
          "You need to allow notifications in your browser’s prompt or site settings to receive alerts."
        );
        return;
      }

      // 2) get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3) reuse existing subscription if we have one
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      // 4) send to backend
      await api.post("/api/push/subscribe", {
        subscription,
      });

      setNotifStatus("Notifications enabled for this device ✅");
    } catch (err) {
      console.error("Enable notifications failed", err);
      setNotifError(
        err?.message || "Could not enable notifications for this browser."
      );
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSaveEmailPrefs = async (e) => {
    e.preventDefault();
    setPrefsError("");
    setPrefsMessage("");
    setSavingPrefs(true);
    try {
      const res = await updateEmailPreferences(emailOptIn);
      const next = !!res.email_picks_opt_in;
      setEmailOptIn(next);
      setPrefsMessage(
        next
          ? "You’ll receive CSB pick emails."
          : "You’ve opted out of CSB pick emails."
      );
    } catch (err) {
      const apiDetail = err?.response?.data?.detail;
      setPrefsError(apiDetail || "Failed to update email preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  // ⭐ Save favourites → context → backend
  const handleSaveFavourites = async (e) => {
    e.preventDefault();
    setFavsError("");
    setFavsMessage("");
    setSavingFavs(true);
    try {
      const teams = favTeamsLocal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const leagues = favLeaguesLocal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await updatePreferences({
        favoriteSports: favSportsLocal,
        favoriteTeams: teams,
        favoriteLeagues: leagues,
      });

      setFavsMessage("Favourites updated ✅");
    } catch (err) {
      console.error("Failed to save favourites", err);
      setFavsError("Failed to save favourites");
    } finally {
      setSavingFavs(false);
    }
  };

  const toggleSport = (sportKey) => {
    setFavSportsLocal((prev) =>
      prev.includes(sportKey)
        ? prev.filter((s) => s !== sportKey)
        : [...prev, sportKey]
    );
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
            Manage your CSB account details, favourites, email preferences and alerts.
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

          {/* ⭐ FAVOURITES */}
          <div className={styles.row}>
            <label className={styles.label}>Favourites</label>
            <div style={{ fontSize: 13 }}>
              <p className={styles.hint}>
                Pick the sports, teams and leagues you care about. Your dashboard
                will surface these fixtures at the top of Today&apos;s Card.
              </p>

              {/* Sports pills */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 6,
                }}
              >
                {ALL_SPORTS.map((s) => {
                  const active = favSportsLocal.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSport(s)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: active
                          ? "1px solid #34d399"
                          : "1px solid rgba(255,255,255,0.3)",
                        background: active
                          ? "rgba(52,211,153,0.18)"
                          : "transparent",
                        color: "#fff",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {s.toUpperCase()}
                    </button>
                  );
                })}
              </div>

              {/* Teams input */}
              <div style={{ marginTop: 10 }}>
                <label
                  style={{ display: "block", fontSize: 12, marginBottom: 4 }}
                >
                  Favourite teams (comma separated)
                </label>
                <input
                  className={styles.input}
                  value={favTeamsLocal}
                  onChange={(e) => setFavTeamsLocal(e.target.value)}
                  placeholder="Celtic, Liverpool, 49ers"
                />
              </div>

              {/* Leagues input */}
              <div style={{ marginTop: 10 }}>
                <label
                  style={{ display: "block", fontSize: 12, marginBottom: 4 }}
                >
                  Favourite leagues (codes, comma separated)
                </label>
                <input
                  className={styles.input}
                  value={favLeaguesLocal}
                  onChange={(e) => setFavLeaguesLocal(e.target.value)}
                  placeholder="EPL, SCO_PREM, NFL"
                />
                <p className={styles.hint} style={{ marginTop: 4 }}>
                  Use the short codes from the site (e.g. EPL, SCO_PREM, NFL).
                </p>
              </div>

              {favsError && (
                <div className={styles.error} style={{ marginTop: 8 }}>
                  {favsError}
                </div>
              )}
              {favsMessage && (
                <div className={styles.success} style={{ marginTop: 8 }}>
                  {favsMessage}
                </div>
              )}

              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost || ""}`}
                onClick={handleSaveFavourites}
                disabled={savingFavs || prefsSavingBackend}
                style={{ marginTop: 10 }}
              >
                {savingFavs || prefsSavingBackend
                  ? "Saving…"
                  : "Save favourites"}
              </button>
            </div>
          </div>

          {/* ✉️ Email picks preferences */}
          <div className={styles.row}>
            <label className={styles.label}>Email picks &amp; alerts</label>
            <div style={{ fontSize: 13 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                />
                <span>
                  Send me CSB pick emails (featured cards, premium round-ups
                  and key account updates).
                </span>
              </label>
              <p className={styles.hint} style={{ marginTop: 6 }}>
                We typically send at most one featured card email per day,
                plus any tipster subscription emails you choose to receive.
              </p>

              {prefsError && (
                <div className={styles.error} style={{ marginTop: 8 }}>
                  {prefsError}
                </div>
              )}
              {prefsMessage && (
                <div className={styles.success} style={{ marginTop: 8 }}>
                  {prefsMessage}
                </div>
              )}

              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost || ""}`}
                onClick={handleSaveEmailPrefs}
                disabled={savingPrefs}
                style={{ marginTop: 8 }}
              >
                {savingPrefs ? "Saving…" : "Save email preferences"}
              </button>
            </div>
          </div>

          {/* 🔔 Notifications */}
          <div className={styles.row}>
            <label className={styles.label}>Notifications</label>
            <div>
              <p className={styles.hint}>
                Turn on browser alerts for shortlist edges, featured picks, and
                important CSB updates on this device.
              </p>

              {notifError && (
                <div className={styles.error} style={{ marginTop: 6 }}>
                  {notifError}
                </div>
              )}
              {notifStatus && (
                <div className={styles.success} style={{ marginTop: 6 }}>
                  {notifStatus}
                </div>
              )}

              <button
                type="button"
                className={styles.btn}
                style={{ marginTop: 8 }}
                onClick={handleEnableNotifications}
                disabled={notifLoading}
              >
                {notifLoading
                  ? "Enabling…"
                  : notifPermission === "granted"
                  ? "Re-sync this browser"
                  : "Enable browser alerts"}
              </button>

              {supportsPush && (
                <div className={styles.hint} style={{ marginTop: 6 }}>
                  Current browser status:{" "}
                  <strong>{notifPermission}</strong>
                  {notifPermission === "denied" &&
                    " – update this in your browser's Site settings to allow notifications."}
                </div>
              )}
              {!supportsPush && (
                <div className={styles.hint} style={{ marginTop: 6 }}>
                  Your current browser doesn’t support web push notifications.
                  Try Chrome/Edge on desktop or Android.
                </div>
              )}
            </div>
          </div>

          {/* future settings */}
          <div className={styles.row}>
            <label className={styles.label}>Coming soon</label>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: 13 }}>
              <li>More granular notification &amp; email preferences</li>
              <li>Followed tipsters &amp; social features</li>
              <li>Community feeds by team/league</li>
            </ul>
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile changes"}
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
              Followers &amp; following will appear here once we roll out the
              social layer.
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