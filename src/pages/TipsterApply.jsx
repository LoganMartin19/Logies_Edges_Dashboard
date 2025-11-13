// src/pages/TipsterApply.jsx
import React, { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
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

  const update = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

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
    setOk(false);
    setLoading(true);

    try {
      const cleanedUsername = sanitise(form.username);
      const socials = form.social_links || {};
      const twitter = socials.twitter?.trim() || "";
      const instagram = socials.instagram?.trim() || "";

      const adminEmail = "logan.martin1905@gmail.com"; // 🔁 TODO: change to your real CSB admin email

      const subject = `New CSB Tipster Application – @${cleanedUsername || "unknown"}`;

      const lines = [
        "New tipster application for CSB:",
        "",
        `From: ${user.email || "unknown email"}`,
        "",
        `Display name: ${form.name}`,
        `Requested username: ${cleanedUsername}`,
        `Sport focus: ${form.sport_focus}`,
        "",
        `Avatar URL: ${form.avatar_url || "(none)"}`,
        "",
        "Bio:",
        form.bio || "(none)",
        "",
        "Socials:",
        `X / Twitter: ${twitter || "(none)"}`,
        `Instagram: ${instagram || "(none)"}`,
      ];

      const body = encodeURIComponent(lines.join("\n"));

      // Open mail client with pre-filled email
      window.location.href = `mailto:${adminEmail}?subject=${encodeURIComponent(
        subject
      )}&body=${body}`;

      setOk(true);
    } catch (e) {
      setErr("Something went wrong sending your application. Please try again.");
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
            Fill this in to apply for a verified tipster profile on CSB.
            Applications are reviewed manually – creating this does{" "}
            <strong>not</strong> automatically list you.
          </div>
        </header>

        {err && <div className={styles.error}>{err}</div>}
        {ok && (
          <div className={styles.success}>
            Application prepared in your email client. Send the email to complete your application.
          </div>
        )}

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
              {loading ? "Preparing email…" : "Send application"}
            </button>
            <Link to="/tipsters" className={`${styles.btn} ${styles.btnGhost}`}>
              Cancel
            </Link>
          </div>

          <p className={styles.hint} style={{ marginTop: 12 }}>
            Once reviewed, we’ll manually create and verify your tipster profile.
            Verified tipsters will be highlighted on the leaderboard.
          </p>
        </form>
      </div>
    </div>
  );
}