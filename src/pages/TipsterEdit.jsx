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
  });

  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

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
          <Link to="/login" className={styles.btn}>Log in</Link>
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

      const payload = {
        ...form,
        username: sanitise(form.username || username),
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
        social_links: cleanedSocials,
      };

      const res = await tipstersCreate(payload);
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

  // ------------------------------
  // Render form
  // ------------------------------

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.title}>Edit Tipster Profile</div>
          <div className={styles.subtitle}>
            Update your public profile and social links.
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

          <div className={styles.row}>
            <label className={styles.label}>Avatar URL</label>
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
      </div>
    </div>
  );
}