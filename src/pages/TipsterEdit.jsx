// src/pages/TipsterEdit.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link, useParams } from "react-router-dom";
import { tipstersCreate, fetchTipster } from "../api";
import { useAuth } from "../components/AuthGate";
import styles from "../styles/Auth.module.css";

const sanitise = (s = "") =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

export default function TipsterEdit() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { username } = useParams();

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
  });

  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // If not logged in, block
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

  // Load existing tipster data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTipster(username);
        if (cancelled || !data) return;

        // We’ll support both "twitter" and "x" keys if backend changes later
        const socials = data.social_links || {};
        const twitter = socials.twitter || socials.x || "";
        const instagram = socials.instagram || "";

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
        });
      } catch (e) {
        console.error("Failed to load tipster", e);
        setErr("Could not load tipster profile.");
      } finally {
        if (!cancelled) setLoadingInitial(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  const update = (k) => (e) =>
    setForm((prev) => ({
      ...prev,
      [k]: e.target.value,
    }));

  const updateSocial = (key) => (e) =>
    setForm((prev) => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [key]: e.target.value,
      },
    }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    setOk(false);
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
        username: sanitise(form.username || username),
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        social_links,
      };

      const res = await tipstersCreate(payload); // backend will "update" if same email+username
      setOk(true);
      setTimeout(() => nav(`/tipsters/${res.username}`), 600);
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message;
      setErr(
        msg === "username already exists"
          ? "That username is taken."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.title}>Edit Tipster Profile</div>
          <div className={styles.subtitle}>
            Update your public profile and social links. Changes will be
            reflected on your CSB tipster page.
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
              {loading ? "Saving changes…" : "Save changes"}
            </button>
            <Link
              to={`/tipsters/${username}`}
              className={`${styles.btn} ${styles.btnGhost}`}
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}