// src/pages/TipsterEdit.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import {
  tipstersCreate,
  fetchTipster,
  fetchTipsterConnectStatus,
  startTipsterConnectOnboarding,
  fetchTipsterConnectDashboard,
} from "../api";
import { useAuth } from "../components/AuthGate";
import styles from "../styles/Auth.module.css";

// 👇 NEW: storage imports
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const sanitise = (s = "") =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

/* ---------- Avatar Uploader (same pattern as Apply page) ---------- */
function AvatarUploader({ value, onChange }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      const uid = user?.uid || user?.firebaseUid || "anon";
      const ext = file.name.split(".").pop() || "jpg";
      const path = `tipster_avatars/${uid}_${Date.now()}.${ext}`;

      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      onChange(url); // push URL into form.avatar_url
    } catch (err) {
      console.error("Avatar upload failed:", err);
      alert("Could not upload avatar. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* Preview */}
      {value && (
        <img
          src={value}
          alt="Avatar preview"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {uploading && (
        <span style={{ fontSize: 12, opacity: 0.7 }}>Uploading…</span>
      )}
    </div>
  );
}

/* ---------- Main page ---------- */
export default function TipsterEdit() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { username } = useParams();

  // ------------------------------
  // Hooks must always run FIRST
  // ------------------------------
  const [form, setForm] = useState({
    name: "",
    username: "",
    bio: "",
    sport_focus: "Football",
    avatar_url: "",
    social_links: {
      twitter: "",
      instagram: "",
    },
    // 💸 local-only fields for editing
    price_gbp: "", // string, e.g. "15.00"
    subscriber_limit: "", // string, e.g. "50"
    is_open_for_new_subs: true,
  });

  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Stripe Connect status + UX
  const [connectStatus, setConnectStatus] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState("");

  // Load the existing tipster
  useEffect(() => {
    if (!user) return; // user not ready yet

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTipster(username);
        if (cancelled || !data) return;

        const socials = data.social_links || {};
        const twitter = socials.twitter || socials.x || "";
        const instagram = socials.instagram || "";

        // convert cents → "xx.xx"
        const priceCents = data.default_price_cents;
        const price_gbp =
          typeof priceCents === "number"
            ? (priceCents / 100).toFixed(2)
            : "";

        const limit =
          typeof data.subscriber_limit === "number"
            ? String(data.subscriber_limit)
            : "";

        setForm({
          name: data.name || "",
          username: data.username || "",
          bio: data.bio || "",
          sport_focus: data.sport_focus || "Football",
          avatar_url: data.avatar_url || "",
          social_links: {
            twitter,
            instagram,
          },
          price_gbp,
          subscriber_limit: limit,
          is_open_for_new_subs:
            data.is_open_for_new_subs !== undefined
              ? !!data.is_open_for_new_subs
              : true,
        });

        // Fetch current Stripe Connect status for this tipster
        try {
          const status = await fetchTipsterConnectStatus(username);
          if (!cancelled) setConnectStatus(status);
        } catch (e) {
          console.warn("Connect status failed", e);
        }
      } catch (e) {
        setErr("Could not load tipster profile.");
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username, user]);

  // ------------------------------
  // SAFE CONDITIONAL UI RETURNS
  // ------------------------------

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.title}>Edit Tipster Profile</div>
            <div className={styles.subtitle}>Please log in first.</div>
          </div>
          <Link to="/login" className={styles.btn}>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  if (loadingInitial) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.title}>Edit Tipster Profile</div>
            <div className={styles.subtitle}>Loading your profile…</div>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------
  // EDIT FORM
  // ------------------------------

  const update = (k) => (e) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const updateSocial = (key) => (e) =>
    setForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [key]: e.target.value },
    }));

  const updateCheckbox = (k) => (e) =>
    setForm((prev) => ({ ...prev, [k]: e.target.checked }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    setOk(false);

    try {
      const cleanedSocials = {};
      if (form.social_links.twitter.trim())
        cleanedSocials.twitter = form.social_links.twitter.trim();
      if (form.social_links.instagram.trim())
        cleanedSocials.instagram = form.social_links.instagram.trim();

      // price "xx.xx" → cents int or null
      let default_price_cents = null;
      const trimmedPrice = (form.price_gbp || "").trim();
      if (trimmedPrice) {
        const numeric = Number(trimmedPrice);
        if (!Number.isNaN(numeric) && numeric >= 0) {
          default_price_cents = Math.round(numeric * 100);
        }
      }

      // subscriber_limit string → int or null
      let subscriber_limit = null;
      const trimmedLimit = (form.subscriber_limit || "").trim();
      if (trimmedLimit) {
        const numericLimit = parseInt(trimmedLimit, 10);
        if (!Number.isNaN(numericLimit) && numericLimit > 0) {
          subscriber_limit = numericLimit;
        }
      }

      const payload = {
        name: form.name,
        username: sanitise(form.username || username),
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        sport_focus: form.sport_focus || null,
        social_links: cleanedSocials,
        // 💸 new fields for backend
        default_price_cents,
        currency: "GBP",
        subscriber_limit,
        is_open_for_new_subs: !!form.is_open_for_new_subs,
      };

      const res = await tipstersCreate(payload);
      setOk(true);

      setTimeout(() => nav(`/tipsters/${res.username}`), 600);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message;
      setErr(
        msg === "username already exists" ? "That username is taken." : msg
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayoutsClick = async () => {
    setPayoutError("");
    setPayoutLoading(true);
    try {
      // Always re-check latest status
      const status = await fetchTipsterConnectStatus(username);
      setConnectStatus(status);

      if (status.has_connect && status.details_submitted) {
        // Already onboarded → go to dashboard
        const { dashboard_url } = await fetchTipsterConnectDashboard(username);
        if (!dashboard_url) throw new Error("No dashboard URL returned");
        window.location.href = dashboard_url;
      } else {
        // Not onboarded or incomplete → start / resume onboarding
        const { onboarding_url } = await startTipsterConnectOnboarding(
          username
        );
        if (!onboarding_url) throw new Error("No onboarding URL returned");
        window.location.href = onboarding_url;
      }
    } catch (e) {
      console.error("Stripe payouts link failed", e);
      const msg =
        e?.response?.data?.detail ||
        e.message ||
        "Could not open Stripe payouts.";
      setPayoutError(msg);
    } finally {
      setPayoutLoading(false);
    }
  };

  const connectLabel = (() => {
    if (!connectStatus) return "Set up payouts with Stripe";
    if (connectStatus.has_connect && connectStatus.details_submitted) {
      return "Open Stripe dashboard";
    }
    return "Set up payouts with Stripe";
  })();

  // ------------------------------
  // Render form
  // ------------------------------

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.title}>Edit Tipster Profile</div>
          <div className={styles.subtitle}>
            Update your public profile, socials, and subscription settings.
          </div>
        </header>

        {err && <div className={styles.error}>{err}</div>}
        {ok && <div className={styles.success}>Profile updated!</div>}

        <form className={styles.form} onSubmit={submit}>
          <div className={styles.row}>
            <label className={styles.label}>Display name</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={update("name")}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              value={form.username}
              onChange={update("username")}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Sport focus</label>
            <select
              className={styles.input}
              value={form.sport_focus}
              onChange={update("sport_focus")}
            >
              <option>Football</option>
              <option>NFL</option>
              <option>NBA</option>
              <option>NHL</option>
              <option>Tennis</option>
              <option>CFB</option>
            </select>
          </div>

          {/* 👇 UPDATED: Avatar upload + manual URL */}
          <div className={styles.row}>
            <label className={styles.label}>Avatar</label>
            <AvatarUploader
              value={form.avatar_url}
              onChange={(url) =>
                setForm((prev) => ({ ...prev, avatar_url: url || "" }))
              }
            />
            <div className={styles.hint} style={{ marginTop: 4 }}>
              Or paste an image URL manually:
            </div>
            <input
              className={styles.input}
              value={form.avatar_url}
              onChange={update("avatar_url")}
              placeholder="https://… (optional)"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={form.bio}
              onChange={update("bio")}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>X (Twitter)</label>
            <input
              className={styles.input}
              value={form.social_links.twitter}
              onChange={updateSocial("twitter")}
              placeholder="@yourhandle or URL"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Instagram</label>
            <input
              className={styles.input}
              value={form.social_links.instagram}
              onChange={updateSocial("instagram")}
              placeholder="@yourhandle or URL"
            />
          </div>

          {/* 💸 Subscription settings */}
          <div className={styles.row}>
            <label className={styles.label}>Monthly price (GBP)</label>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="0.50"
              value={form.price_gbp}
              onChange={update("price_gbp")}
              placeholder="e.g. 15.00"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Subscriber limit</label>
            <input
              className={styles.input}
              type="number"
              min="1"
              step="1"
              value={form.subscriber_limit}
              onChange={update("subscriber_limit")}
              placeholder="Leave blank for unlimited"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={form.is_open_for_new_subs}
                onChange={updateCheckbox("is_open_for_new_subs")}
                style={{ marginRight: 8 }}
              />
              Open for new subscribers
            </label>
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? "Saving…" : "Save"}
            </button>
            <Link
              to={`/tipsters/${username}`}
              className={`${styles.btn} ${styles.btnGhost}`}
            >
              Cancel
            </Link>
          </div>
        </form>

        {/* Stripe payouts section */}
        <hr
          style={{
            margin: "1.75rem 0 1.25rem",
            border: "none",
            borderTop: "1px solid rgba(148,163,184,0.35)",
          }}
        />

        <div className={styles.row}>
          <label className={styles.label}>Payouts (Stripe)</label>
          <div>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#6B7280",
                marginBottom: "0.75rem",
                maxWidth: 420,
              }}
            >
              Connect your Stripe account to receive tipster subscription
              payouts. If you&apos;ve already finished onboarding, this button
              will open your Stripe dashboard instead.
            </p>
            <button
              type="button"
              onClick={handleStripePayoutsClick}
              className={styles.btn}
              disabled={payoutLoading}
            >
              {payoutLoading ? "Opening Stripe…" : connectLabel}
            </button>
            {payoutError && (
              <div className={styles.error} style={{ marginTop: "0.6rem" }}>
                {payoutError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}