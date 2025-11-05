// src/pages/TipsterApply.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { tipstersCreate } from "../api";
import { useAuth } from "../components/AuthGate";
import styles from "../styles/Auth.module.css";

const sanitise = (s="") => (s || "")
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
    social_links: {},
  });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.title}>Become a Tipster</div>
            <div className={styles.subtitle}>Please log in first.</div>
          </div>
          <Link to="/login" className={styles.btn}>Log in</Link>
        </div>
      </div>
    );
  }

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        username: sanitise(form.username),
        bio: form.bio || null,
        avatar_url: form.avatar_url || null,
      };
      const res = await tipstersCreate(payload);
      setOk(true);
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
          <div className={styles.title}>Become a Tipster</div>
          <div className={styles.subtitle}>
            Create your public profile and start posting picks.
          </div>
        </header>

        {err && <div className={styles.error}>{err}</div>}
        {ok && <div className={styles.success}>Profile created!</div>}

        <form className={styles.form} onSubmit={submit}>
          <div className={styles.row}>
            <label className={styles.label}>Display name</label>
            <input className={styles.input} value={form.name} onChange={update("name")} required />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Username</label>
            <input className={styles.input} value={form.username} onChange={update("username")} required />
            <div className={styles.hint}>lowercase letters / numbers / _ (max 20)</div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Sport focus</label>
            <select className={styles.input} value={form.sport_focus} onChange={update("sport_focus")}>
              <option>Football</option><option>NFL</option><option>NBA</option>
              <option>NHL</option><option>Tennis</option><option>CFB</option>
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Avatar URL (optional)</label>
            <input className={styles.input} value={form.avatar_url} onChange={update("avatar_url")} />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Bio</label>
            <textarea className={styles.textarea} rows={4} value={form.bio} onChange={update("bio")} />
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? "Saving…" : "Create profile"}
            </button>
            <Link to="/tipsters" className={`${styles.btn} ${styles.btnGhost}`}>Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}