// src/pages/SignUpPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../styles/Auth.module.css";
import { auth, googleProvider } from "../firebase";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";

export default function SignUpPage() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onGoogle = async () => {
    try {
      setErr("");
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      nav("/");
    } catch (e) {
      setErr(e.message || "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  };

  const onEmail = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      if (name.trim()) {
        await updateProfile(cred.user, { displayName: name.trim() });
      }
      nav("/");
    } catch (e) {
      setErr(e.message || "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.title}>Create account</div>
          <div className={styles.subtitle}>
            Unlock dashboards, save picks, and follow tipsters.
          </div>
        </header>

        <div className={styles.oauth}>
          <button onClick={onGoogle} className={styles.oauthBtn} disabled={loading}>
            <span className={styles.googleLogo}>G</span>
            <span>Continue with Google</span>
          </button>
        </div>

        <form className={styles.form} onSubmit={onEmail}>
          <div className={styles.row}>
            <label className={styles.label}>Name (optional)</label>
            <input
              className={styles.input}
              value={name}
              onChange={(e)=>setName(e.target.value)}
              placeholder="Logan"
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={pw}
              onChange={(e)=>setPw(e.target.value)}
              placeholder="At least 6 characters"
              required
            />
          </div>

          {err && <div className={styles.error}>{err}</div>}

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? "Creating…" : "Sign up"}
            </button>
            <Link to="/login" className={`${styles.btn} ${styles.btnGhost}`}>
              Already have an account? Log in
            </Link>
          </div>
        </form>

        <p className={styles.note}>
          You can switch to a Tipster account later in Settings.
        </p>
      </div>
    </div>
  );
}