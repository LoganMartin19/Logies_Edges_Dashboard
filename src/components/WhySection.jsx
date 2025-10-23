// src/components/WhySection.jsx
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../api"; // ✅ env-based axios client

const pct = (p) =>
  Number.isFinite(+p) ? `${(+p * 100).toFixed(1)}%` : p != null ? String(p) : "—";
const money = (x) =>
  Number.isFinite(+x) ? (+x >= 100 ? (+x).toFixed(0) : (+x).toFixed(2)) : "—";
const num = (x, d = 2) => (Number.isFinite(+x) ? (+x).toFixed(d) : "—");

// Normalize market codes to what your backend expects (same idea as elsewhere)
const normalizeMarket = (raw) => {
  if (!raw) return "";
  let x = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  const syn = {
    BTTSYES: "BTTS_Y",
    BTTSY: "BTTS_Y",
    BOTHTEAMSTOSCOREYES: "BTTS_Y",
    BTTSNO: "BTTS_N",
    BTTSN: "BTTS_N",
    BOTHTEAMSTOSCORENO: "BTTS_N",
    HOMEWIN: "HOME_WIN",
    AWAYWIN: "AWAY_WIN",
  };
  if (syn[x]) return syn[x];
  // Over/Under lines
  const m = x.match(/^(OVER|UNDER)?([OU])?(\d+(?:\.\d+)?)$/);
  if (m) {
    const line = m[3];
    if (x.startsWith("OVER") || x.startsWith("O")) return `O${line}`;
    if (x.startsWith("UNDER") || x.startsWith("U")) return `U${line}`;
  }
  if (/^O\d+(\.\d+)?$/.test(x) || /^U\d+(\.\d+)?$/.test(x)) return x;
  return x;
};

export default function WhySection({ fixtureId, market = "O2.5" }) {
  const [explain, setExplain] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const normMarket = useMemo(() => normalizeMarket(market), [market]);

  useEffect(() => {
    let alive = true;
    setExplain(null);
    setError("");
    setLoading(true);

    api
      .get("/explain/probability", {
        params: { fixture_id: fixtureId, market: normMarket, _ts: Date.now() }, // cache-buster
      })
      .then(({ data }) => {
        if (!alive) return;
        setExplain(data || {});
      })
      .catch((e) => {
        if (!alive) return;
        setError(e?.message || "Failed to load rationale.");
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [fixtureId, normMarket]);

  if (loading) return <div className="card">Why? <small>loading…</small></div>;
  if (error) return <div className="card">Why? <small>({error})</small></div>;
  if (!explain) return <div className="card">Why? <small>no data</small></div>;

  const eg = explain.form?.expected_goals;
  const egLine =
    eg && Number.isFinite(eg.home) && Number.isFinite(eg.away) && Number.isFinite(eg.total)
      ? `${num(eg.home)} + ${num(eg.away)} = ${num(eg.total)}`
      : null;

  // Backends sometimes return prob as 0–1, or already %; handle both
  const modelProb =
    Number.isFinite(explain.model_probability)
      ? pct(explain.model_probability <= 1 ? explain.model_probability : explain.model_probability / 100)
      : "—";

  const fair =
    Number.isFinite(explain.fair_price) ? money(explain.fair_price) : explain.fair_price ?? "—";

  const conf = (explain.confidence || "").toString();

  return (
    <div className="card">
      <h3>Why?</h3>
      <p>Market: {explain.market || normMarket}</p>
      {egLine && <p>Expected goals (form blend): {egLine}</p>}
      <p>Model Probability: {modelProb}</p>
      <p>Fair Odds: {fair}</p>
      <p>
        Confidence:{" "}
        <span className={`conf-${conf.toLowerCase()}`}>{conf || "—"}</span>
      </p>
      {(explain.notes || []).length > 0 ? (
        <ul>
          {explain.notes.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      ) : (
        <p style={{ color: "#666" }}>No extra notes available.</p>
      )}
    </div>
  );
}