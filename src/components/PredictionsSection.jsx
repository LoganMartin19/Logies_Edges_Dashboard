// src/components/PredictionsSection.jsx
import React, { useEffect, useState } from "react";
import styles from "../styles/FixturePage.module.css";
import { api } from "../api"; // ✅ env-based axios client

const toPct100 = (v) => {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? n * 100 : n;
};
const fmtPct = (v) => (v == null ? "—" : `${Number(v).toFixed(1)}%`);

export default function PredictionsSection({ fixtureId }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // analyst text + confidence
  const [analysis, setAnalysis] = useState({
    paragraphs: [],
    disclaimer: "Bet responsibly.",
    confidence: "Low",
  });

  // model probabilities (from team_form)
  const [probs, setProbs] = useState({ home: null, draw: null, away: null });

  // best bets / edges
  const [bets, setBets] = useState([]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");
    setAnalysis({ paragraphs: [], disclaimer: "Bet responsibly.", confidence: "Low" });
    setProbs({ home: null, draw: null, away: null });
    setBets([]);

    (async () => {
      try {
        // 1) Get fixture to derive its KO date for /admin/fixture-probs
        const [{ data: fxJ }] = await Promise.all([
          api.get(`/api/fixtures/id/${fixtureId}/json`),
        ]);
        const koIso = fxJ?.fixture?.kickoff_utc || null;
        const day = koIso
          ? (koIso.includes("T") ? koIso.slice(0, 10) : koIso)
          : new Date().toISOString().slice(0, 10);

        // 2) Pull model probabilities for that day, then pick our fixture
        const [{ data: probsDay }] = await Promise.all([
          api.get(`/admin/fixture-probs`, { params: { source: "team_form", day } }),
        ]);

        const matchRow = Array.isArray(probsDay)
          ? probsDay.find((r) => Number(r.fixture_id) === Number(fixtureId))
          : null;

        if (alive && matchRow?.markets) {
          setProbs({
            home: toPct100(matchRow.markets.HOME_WIN),
            draw: toPct100(matchRow.markets.DRAW),
            away: toPct100(matchRow.markets.AWAY_WIN),
          });
        }

        // 3) Analyst paragraphs (keep, but DO NOT trust its probs)
        try {
          const { data: expertJ } = await api.get(`/api/ai/preview/expert`, {
            params: { fixture_id: fixtureId },
          });
          if (alive) {
            const a = expertJ?.analysis || {};
            setAnalysis({
              paragraphs: Array.isArray(a.paragraphs) ? a.paragraphs : [],
              disclaimer: a?.disclaimer || "Bet responsibly.",
              confidence: a?.confidence || "Low",
            });
          }
        } catch {
          /* non-fatal */
        }

        // 4) Live edges for this fixture (source=team_form)
        try {
          const { data: edgesJ } = await api.get(`/admin/fixture-edges`, {
            params: { source: "team_form", fixture_id: fixtureId },
          });
          if (alive && Array.isArray(edgesJ)) {
            const mapped = edgesJ
              .slice()
              .sort((a, b) => b.edge - a.edge)
              .map((e) => ({
                market: e.market,
                price: Number(e.price),
                bookmaker: e.bookmaker,
                edge_pct: Number(e.edge) * 100,
                why: "",
              }));
            setBets(mapped);
          }
        } catch {
          /* ignore */
        }
      } catch (e) {
        if (alive) setErr(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [fixtureId]);

  if (loading) return <p className={styles.loading}>Loading predictions…</p>;
  if (err) return <p className={styles.error}>Error: {err}</p>;

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
            <b>Confidence:</b> {analysis.confidence || "—"}
          </div>
        </div>
      </div>

      {/* Analyst paragraphs */}
      <div className={styles.card}>
        {(analysis.paragraphs || []).map((p, i) => (
          <p key={i} style={{ marginTop: i ? 6 : 0 }}>
            {p}
          </p>
        ))}
        <small className={styles.disclaimer}>{analysis.disclaimer}</small>
      </div>

      {/* Best Bets (from edges) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>Best Bets (from our edges)</div>
        {!bets.length ? (
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
                    {b.edge_pct != null ? `${Number(b.edge_pct).toFixed(1)}%` : "—"}
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