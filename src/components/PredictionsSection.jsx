// src/components/PredictionsSection.jsx
import React, { useEffect, useState } from "react";
import styles from "../styles/FixturePage.module.css";

const toPct = (v) => {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  // Accept either 0..1 or 0..100
  return n <= 1 ? n * 100 : n;
};

const fmtPct = (v) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);

export default function PredictionsSection({ fixtureId }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");

    fetch(
      `https://logies-edges-api.onrender.com/api/ai/preview/expert?fixture_id=${fixtureId}`
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (!alive) return;
        // API shape: { fixture_id, home, away, analysis: {...} }
        const a = j?.analysis || null;

        // Normalize probabilities in case backend returns 0..1
        const p = a?.probabilities || {};
        const probsNormalized = {
          home: toPct(p.home),
          draw: toPct(p.draw),
          away: toPct(p.away),
        };

        setData({
          ...a,
          probabilities: probsNormalized,
          best_bets: Array.isArray(a?.best_bets) ? a.best_bets : [],
          confidence: a?.confidence || "Low",
          disclaimer: a?.disclaimer || "Bet responsibly.",
          paragraphs: Array.isArray(a?.paragraphs) ? a.paragraphs : [],
        });
      })
      .catch((e) => alive && setErr(e.message))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [fixtureId]);

  if (loading) return <p className={styles.loading}>Loading predictions…</p>;
  if (err) return <p className={styles.error}>Error: {err}</p>;
  if (!data) return <p>No prediction available yet.</p>;

  const probs = data.probabilities || {};
  const bets = data.best_bets || [];

  return (
    <div className={styles.tabContent}>
      <h3>Analyst Prediction</h3>

      {/* Probabilities */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>Win Probabilities (model)</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div>
            <b>Home:</b> {fmtPct(probs.home)}
          </div>
          <div>
            <b>Draw:</b> {fmtPct(probs.draw)}
          </div>
          <div>
            <b>Away:</b> {fmtPct(probs.away)}
          </div>
          <div style={{ marginLeft: "auto" }}>
            <b>Confidence:</b> {data.confidence || "—"}
          </div>
        </div>
      </div>

      {/* Analyst paragraphs */}
      <div className={styles.card}>
        {(data.paragraphs || []).map((p, i) => (
          <p key={i} style={{ marginTop: i ? 6 : 0 }}>
            {p}
          </p>
        ))}
        <small className={styles.disclaimer}>{data.disclaimer}</small>
      </div>

      {/* Best Bets */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>Best Bets (from our edges)</div>
        {bets.length === 0 ? (
          <div className={styles.empty}>No positive edges right now.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Market</th>
                <th className={styles.num}>Price</th>
                <th>Book</th>
                <th className={styles.num}>Edge</th>
                <th>Why</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b, i) => (
                <tr key={i}>
                  <td>{b.market}</td>
                  <td className={styles.num}>
                    {b.price != null ? Number(b.price).toFixed(2) : "—"}
                  </td>
                  <td>{b.bookmaker || "—"}</td>
                  <td className={styles.num}>
                    {b.edge_pct != null
                      ? `${Number(b.edge_pct).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td>{b.why || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}