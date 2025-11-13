// src/pages/TipsterApply.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { tipstersCreate } from "../api";
import { useAuth } from "../components/AuthGate";
import styles from "../styles/Auth.module.css";

const sanitise = (s = "") =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

export default function TipsterApply() {
  const { user } = useAuth();
  const nav = useNavigate();

  const suggested = useMemo(
    () => sanitise(user?.displayName) || sanitise(user?.email?.split("@")[0]),
    [user]
  );

  const [form, setForm] = useState({
    name: user?.displayName || "",
    username: suggested || "",
    bio: "",
    sport_focus: "Football",
    avatar_url: user?.photoURL || "",
    social_links: {
      twitter: "",
      instagram: "",
    },
  });

  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.title}>Apply to become a Tipster</div>
            <div className={styles.subtitle}>Please log in first.</div>
          </div>
          <Link to="/login" className={styles.btn}>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const updateSocial = (key) => (e) =>
    setForm({
      ...form,
      social_links: {
        ...form.social_links,
        [key]: e.target.value,
      },
    });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      // Clean up social links (drop empty ones)
      const social_links = {};
      if (form.social_links?.twitter?.trim()) {
        social_links.twitter = form.social_links.twitter.trim();
      }
      if (form.social_links?.instagram?.trim()) {
        social_links.instagram = form.social_links.instagram.trim();
      }

      const payload = {
        ...form,
        username: sanitise(form.username),
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        social_links,
      };

      const res = await tipstersCreate(payload);
      setOk(true);
      // On success, go straight to their tipster profile
      setTimeout(() => nav(`/tipsters/${res.username}`), 600);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message;
      setErr(msg === "username already exists" ? "That username is taken." : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.title}>Apply to become a Tipster</div>
          <div className={styles.subtitle}>
            Create your public profile. We’ll use this to review and verify
            tipsters for the CSB platform.
          </div>
        </header>

        {err && <div className={styles.error}>{err}</div>}
        {ok && <div className={styles.success}>Profile created!</div>}

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
            <div className={styles.hint}>
              lowercase letters / numbers / _ (max 20)
            </div>
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

          <div className={styles.row}>
            <label className={styles.label}>Avatar URL (optional)</label>
            <input
              className={styles.input}
              value={form.avatar_url}
              onChange={update("avatar_url")}
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={form.bio}
              onChange={update("bio")}
              placeholder="Tell people what you specialise in, staking style, leagues, etc."
            />
          </div>

          {/* 🔗 Socials */}
          <div className={styles.row}>
            <label className={styles.label}>X (Twitter)</label>
            <input
              className={styles.input}
              value={form.social_links.twitter}
              onChange={updateSocial("twitter")}
              placeholder="@yourhandle or full URL"
            />
            <div className={styles.hint}>
              We’ll show this on your tipster page so followers can find you on X.
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Instagram</label>
            <input
              className={styles.input}
              value={form.social_links.instagram}
              onChange={updateSocial("instagram")}
              placeholder="@yourhandle or full URL"
            />
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? "Sending application…" : "Submit application"}
            </button>
            <Link to="/tipsters" className={`${styles.btn} ${styles.btnGhost}`}>
              Cancel
            </Link>
          </div>

          <p className={styles.hint} style={{ marginTop: 12 }}>
            We reserve the right to approve / verify tipsters manually. Verified
            tipsters will be highlighted on the leaderboard.
          </p>
        </form>
      </div>
    </div>
  );
}