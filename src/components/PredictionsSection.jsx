// src/components/PredictionsSection.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api"; // ✅ env-based axios client
import styles from "../styles/FixturePage.module.css";

export default function PredictionsSection({ fixtureId }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState("");         // AI narrative (expert bettor tone)
  const [detail, setDetail] = useState(null);         // includes odds + best_edges
  const [expanded, setExpanded] = useState(null);     // which edge row is expanded for "Why?"

  // Load AI preview (public read) + fixture detail (for edges/odds)
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr("");

    const p1 = api
      .get("/api/public/ai/preview/by-fixture", { params: { fixture_id: fixtureId } })
      .then(({ data }) => data?.preview || "");

    const p2 = api
      .get(`/api/fixtures/id/${fixtureId}/json`)
      .then(({ data }) => data)
      .catch(() => null);

    Promise.all([p1, p2])
      .then(([pv, det]) => {
        if (!alive) return;
        setPreview(pv || "");
        setDetail(det || null);
      })
      .catch((e) => {
        if (!alive) return;
        console.error(e);
        setErr("Failed to load predictions.");
      })
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [fixtureId]);

  // Top edges (sorted desc by edge)
  const topEdges = useMemo(() => {
    const edges = detail?.best_edges || [];
    return [...edges]
      .filter(e => Number.isFinite(e?.edge))
      .sort((a, b) => (b.edge ?? 0) - (a.edge ?? 0))
      .slice(0, 5);
  }, [detail]);

  const fixture = detail?.fixture || {};
  const matchLabel = fixture?.home_team && fixture?.away_team
    ? `${fixture.home_team} v ${fixture.away_team}`
    : "";

  const onToggleWhy = (idx) => setExpanded(expanded === idx ? null : idx);

  if (loading) return <p>Loading predictions…</p>;
  if (err) return <p style={{ color: "#c00" }}>{err}</p>;

  return (
    <div className={styles.tabContent}>
      <h3>Analyst Preview</h3>

      {/* AI narrative */}
      {preview ? (
        <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
          {preview}
        </p>
      ) : (
        <p className={styles.muted}>
          Our analyst write-up is coming soon for this fixture.
        </p>
      )}

      {/* Best bet ideas from your model */}
      <div style={{ marginTop: 18 }}>
        <h4>Best Bet Ideas</h4>
        {topEdges.length === 0 ? (
          <p className={styles.muted}>No priced edges available yet.</p>
        ) : (
          <table className={styles.oddsTable}>
            <thead>
              <tr>
                <th>Market</th>
                <th className={styles.num}>Price</th>
                <th className={styles.num}>Model p</th>
                <th className={styles.num}>Edge</th>
                <th>Book</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {topEdges.map((e, i) => {
                const idx = i;
                const probPct = Number.isFinite(e.prob) ? (e.prob * 100).toFixed(1) + "%" : "—";
                const edgePct = Number.isFinite(e.edge) ? (e.edge * 100).toFixed(1) + "%" : "—";
                const price = Number.isFinite(e.price) ? Number(e.price).toFixed(2) : "—";
                const whyHref = `/fixture/${fixtureId}#why-${encodeURIComponent(e.market)}`;

                // Build quick add link to Bet Tracker (same pattern as elsewhere)
                const qs = new URLSearchParams({
                  fixture_id: String(fixtureId),
                  teams: matchLabel || "",
                  comp: fixture?.comp || "",
                  market: e.market || "",
                  bookmaker: e.bookmaker || "",
                  price: Number.isFinite(e.price) ? String(e.price) : "",
                  stake: "",
                  notes: "",
                });
                const addBetHref = `/bets?${qs.toString()}`;

                return (
                  <React.Fragment key={`${e.market}-${e.bookmaker}-${i}`}>
                    <tr>
                      <td>{e.market}</td>
                      <td className={styles.num}>{price}</td>
                      <td className={styles.num}>{probPct}</td>
                      <td className={styles.num} style={{ fontWeight: 600 }}>
                        {edgePct}
                      </td>
                      <td>{e.bookmaker}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button onClick={() => onToggleWhy(idx)} className={styles.whyButton}>
                          {expanded === idx ? "Hide" : "Why?"}
                        </button>
                        <Link to={addBetHref} className={styles.addBetLink} style={{ marginLeft: 8 }}>
                          ➕ Add Bet
                        </Link>
                      </td>
                    </tr>

                    {expanded === idx && (
                      <tr>
                        <td colSpan={6}>
                          <div className={styles.whyBox}>
                            <AnalystWhy fixtureId={fixtureId} market={e.market} />
                            <div style={{ marginTop: 6 }}>
                              <Link to={whyHref} className={styles.smallLink}>
                                See full explanation on the fixture page
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** Small helper that calls your model explainer for a market and prints a concise rationale */
function AnalystWhy({ fixtureId, market }) {
  const [text, setText] = useState("Loading…");

  useEffect(() => {
    let alive = true;
    // Reuse your explainer (returns structured notes; we condense for this inline view)
    api
      .get("/explain/probability", { params: { fixture_id: fixtureId, market } })
      .then(({ data }) => {
        if (!alive) return;
        const bits = [];
        const eg = data?.form?.expected_goals;
        if (eg && Number.isFinite(eg.total)) {
          bits.push(`xG total ${eg.total.toFixed(2)} (H ${eg.home?.toFixed?.(2)} / A ${eg.away?.toFixed?.(2)})`);
        }
        (data?.notes || []).slice(0, 3).forEach(n => bits.push(n));
        if (data?.recommendation) bits.push(`Rec: ${data.recommendation}`);
        setText(bits.length ? "• " + bits.join(" • ") : "No extra context available.");
      })
      .catch(() => setText("No extra context available."));
    return () => { alive = false; };
  }, [fixtureId, market]);

  return <div>{text}</div>;
}