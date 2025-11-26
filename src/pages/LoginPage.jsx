// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../styles/Auth.module.css";
import { auth, googleProvider } from "../firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,   // 👈 NEW
} from "firebase/auth";

export default function LoginPage() {
  const nav = useNavigate();
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
      setErr(e.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const onEmail = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      nav("/");
    } catch (e) {
      setErr(e.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // 🔐 Forgot password handler
  const onForgotPassword = async () => {
    if (!email.trim()) {
      setErr("Please enter your email first to reset your password.");
      return;
    }
    try {
      setErr("");
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      setErr("Password reset email sent. Check your inbox.");
    } catch (e) {
      setErr(e.message || "Could not send password reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.title}>Log in</div>
          <div className={styles.subtitle}>
            Welcome back — let’s find some edges.
          </div>
        </header>

        <div className={styles.oauth}>
          <button
            onClick={onGoogle}
            className={styles.oauthBtn}
            disabled={loading}
          >
            <span className={styles.googleLogo}>G</span>
            <span>Continue with Google</span>
          </button>
        </div>

        <form className={styles.form} onSubmit={onEmail}>
          <div className={styles.row}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              required
            />
          </div>
          <div className={styles.row}>
            <label className={styles.label}>Password</label>
            <input
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {/* Forgot password link */}
          <div
            style={{
              textAlign: "right",
              marginTop: "-4px",
              marginBottom: "8px",
              fontSize: "0.85rem",
            }}
          >
            <button
              type="button"
              onClick={onForgotPassword}
              disabled={loading}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#9be7ff",
                textDecoration: "underline",
                cursor: "pointer",
              }}
            >
              Forgot password?
            </button>
          </div>

          {err && <div className={styles.error}>{err}</div>}

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
            <Link to="/signup" className={`${styles.btn} ${styles.btnGhost}`}>
              Create account
            </Link>
          </div>
        </form>

        <p className={styles.note}>
          By continuing you agree to our Terms and acknowledge our Privacy
          Policy.
        </p>
      </div>
    </div>
  );
}