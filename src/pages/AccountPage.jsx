// src/pages/AccountPage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/AuthGate";
import { fetchMyTipster } from "../api";
import styles from "../styles/Auth.module.css";

export default function AccountPage() {
  const { user } = useAuth();
  const [myTipster, setMyTipster] = useState(null);
  const [loadingTipster, setLoadingTipster] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setMyTipster(null);
      setLoadingTipster(false);
      return;
    }

    setLoadingTipster(true);
    fetchMyTipster()
      .then((t) => {
        if (!cancelled) setMyTipster(t);
      })
      .catch(() => {
        if (!cancelled) setMyTipster(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingTipster(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const displayInitial =
    (user.displayName && user.displayName[0]) ||
    (user.email && user.email[0]) ||
    "U";

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.title}>Profile &amp; Settings</div>
          <div className={styles.subtitle}>
            Manage your CSB account details. More personalisation and follow features coming soon.
          </div>
        </header>

        {/* Account summary */}
        <section className={styles.section}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "999px",
                background: "rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: "1rem",
              }}
            >
              {displayInitial.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user.displayName || "Unnamed user"}</div>
              <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>{user.email}</div>
            </div>
          </div>

          <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
            In future you’ll be able to:
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>Update your display name and avatar</li>
              <li>Choose favourite sports and leagues</li>
              <li>Manage notifications and email alerts</li>
            </ul>
          </div>
        </section>

        {/* Tipster section if they have a profile */}
        <section className={styles.section} style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8 }}>Tipster profile</h3>

          {loadingTipster ? (
            <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>Checking tipster status…</div>
          ) : myTipster ? (
            <div
              style={{
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 12,
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <div style={{ marginBottom: 6, fontWeight: 600 }}>
                {myTipster.name} @{myTipster.username}
              </div>
              <div style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: 8 }}>
                30D stats: ROI {((myTipster.roi_30d || 0) * 100).toFixed(1)}%, Profit{" "}
                {(myTipster.profit_30d || 0).toFixed(2)}, Picks{" "}
                {myTipster.picks_30d || 0}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link
                  to={`/tipsters/${myTipster.username}`}
                  className={styles.btn}
                  style={{ textDecoration: "none", fontSize: "0.9rem" }}
                >
                  View public page
                </Link>
                <Link
                  to={`/tipsters/${myTipster.username}/edit`}
                  className={`${styles.btn} ${styles.btnGhost}`}
                  style={{ textDecoration: "none", fontSize: "0.9rem" }}
                >
                  Edit tipster profile
                </Link>
              </div>

              <div style={{ fontSize: "0.8rem", opacity: 0.7, marginTop: 8 }}>
                Followers &amp; following will appear here once we roll out the social layer.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
              You don’t have a tipster profile yet.
              <br />
              <Link to="/tipsters/become" style={{ color: "#7fe39a" }}>
                Apply to become a verified tipster →
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}