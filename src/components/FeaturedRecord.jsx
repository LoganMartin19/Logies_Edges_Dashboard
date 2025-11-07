import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

export default function FeaturedRecord({ span = "30d" }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get("/api/public/picks/record", { params: { span } })
      .then(({ data }) => { if (alive) setData(data || {}); })
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [span]);

  const s = data?.summary || {};
  const badge = useMemo(() => {
    const won  = s?.record?.won  ?? 0;
    const lost = s?.record?.lost ?? 0;
    const v    = s?.record?.void ?? 0;
    const roiPct = typeof s?.roi === "number" ? `${s.roi.toFixed(1)}%` : "—";
    const picksCount = data?.picks?.length ?? 0;
    return { text: `Record: ${won}W-${lost}L-${v}V`, roi: roiPct, count: picksCount };
  }, [data, s]);

  const picks = data?.picks || []; // ✅ define picks for render

  return (
    <>
      {/* Header badge (click to open) */}
      <button
        onClick={() => setOpen(true)}
        style={{
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,.15)",
          background: "rgba(0,0,0,.25)",
          padding: "6px 10px",
          color: "#fff",
          display: "inline-flex",
          gap: 10,
          alignItems: "center",
          fontWeight: 700,
        }}
        title={`View ${span} record`}
      >
        {badge.text}
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 8,
            background: "rgba(15,88,40,.18)",
            border: "1px solid rgba(15,88,40,.35)",
            fontWeight: 800,
          }}
        >
          ROI {badge.roi}
        </span>
        <span style={{ opacity: 0.75, fontWeight: 500 }}>
          ({badge.count} picks / {span})
        </span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="rec-overlay" role="dialog" aria-modal="true">
          <div className="rec-panel">
            <div className="rec-head">
              <div style={{ fontWeight: 800, fontSize: 18, color: "#eaf4ed" }}>
                Featured Picks — {span}
              </div>
              <button className="rec-close" onClick={() => setOpen(false)}>Close</button>
            </div>

            {loading ? (
              <div className="rec-muted">Loading…</div>
            ) : !picks.length ? (
              <div className="rec-muted">No picks in this period.</div>
            ) : (
              <>
                {/* Scrollable table wrapper for small screens */}
                <div className="rec-scroll">
                  <table className="rec-table">{/* ✅ matches CSS selector */}
                    <thead>
                      <tr>
                        <th className="fixture">Fixture</th>
                        <th>Comp</th>
                        <th>Market</th>
                        <th className="col-book">Book</th>
                        <th className="col-odds">Odds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {picks.map((p, i) => {
                        const matchup =
                          p.matchup ||
                          (p.home_team && p.away_team ? `${p.home_team} v ${p.away_team}` : "—");
                        const comp = p.comp || p.league || "—";
                        return (
                          <tr key={i}>
                            <td className="fixture">{matchup}</td>
                            <td>{comp}</td>
                            <td>{p.market || "—"}</td>
                            <td className="col-book">{p.bookmaker || "—"}</td>
                            <td className="col-odds">
                              {p.price ? Number(p.price).toFixed(2) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Kelly calculator (optional) */}
                <div className="rec-card" style={{ marginTop: 16 }}>
                  <div className="rec-subtitle">Kelly Stake Calculator</div>
                  <Kelly />
                </div>
              </>
            )}
          </div>

          {/* click outside to close */}
          <div className="rec-backdrop" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* styles */}
      <style jsx="true">{`
        .rec-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: end center; }
        .rec-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); }
        .rec-panel {
          position: relative; width: min(980px, 100%); max-height: 88vh;
          background: #0f1110; color: #eaf4ed; border-top-left-radius: 16px; border-top-right-radius: 16px;
          border: 1px solid rgba(255,255,255,.12); box-shadow: 0 -12px 30px rgba(0,0,0,.35);
          padding: 12px; overflow: auto; -webkit-overflow-scrolling: touch;
        }
        .rec-head {
          display: flex; align-items: center; gap: 8px; position: sticky; top: 0;
          padding: 6px 0 10px 0;
          background: linear-gradient(180deg, rgba(15,17,16,1) 70%, rgba(15,17,16,0) 100%);
          z-index: 2; border-bottom: 1px solid rgba(255,255,255,.08);
        }
        .rec-close { margin-left: auto; padding: 6px 10px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,.18); background: #111; color: #fff; cursor: pointer; }
        .rec-muted { color: rgba(255,255,255,.75); }

        .rec-scroll { overflow-x: auto; }
        .rec-table { width: 100%; border-collapse: collapse; table-layout: auto; }
        .rec-table thead th {
          text-align: left; font-weight: 700; padding: 10px 8px; font-size: 13px;
          border-bottom: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06);
        }
        .rec-table tbody td {
          padding: 12px 8px; border-bottom: 1px solid rgba(255,255,255,.08); font-size: 14px;
        }
        /* make fixture readable */
        .rec-table .fixture { white-space: normal; line-height: 1.25; min-width: 220px; }

        .rec-card { background: #111; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; padding: 12px; }
        .rec-subtitle { font-weight: 700; margin-bottom: 8px; }

        /* ---------- Mobile: full-screen + readable columns ---------- */
        @media (max-width: 700px) {
          .rec-overlay { place-items: stretch; }
          .rec-panel{
            width: 100vw; height: 100dvh; max-height: none; inset: 0; border-radius: 0;
            padding: calc(10px + env(safe-area-inset-top)) 10px calc(28px + env(safe-area-inset-bottom) + 72px);
          }
          .rec-head{ position: sticky; top: env(safe-area-inset-top); }
          /* show the matchup; trim less-critical columns */
          .rec-table .col-book, .rec-table .col-odds { display: none; }
          .rec-table .fixture { min-width: auto; }
        }
      `}</style>
    </>
  );
}

/* ---------- (optional) helpers for future result coloring ---------- */
function colorFor(res = "") {
  const r = res.toLowerCase();
  if (r === "won") return "#0f5828";
  if (r === "lost") return "#c62828";
  return "#eaf4ed";
}
function prettyResult(res = "") {
  const r = res?.toUpperCase?.() || "—";
  if (r === "VOID") return "Void";
  return r;
}

/* ---------- Kelly (responsive) ---------- */
function Kelly() {
  const [bank, setBank] = useState("1000");
  const [p, setP] = useState("0.55");
  const [odds, setOdds] = useState("1.91");

  const k = useMemo(() => {
    const bankroll = clamp(+bank, 0, 1e9);
    const prob = clamp(+p, 0, 1);
    const o = clamp(+odds, 1.01, 1e4);
    const b = o - 1; const q = 1 - prob;
    const f = Math.max(0, (b * prob - q) / b);
    return { f, stake: bankroll * f };
  }, [bank, p, odds]);

  return (
    <>
      <div className="kelly-grid">
        <label><div className="lab">Bankroll (£)</div>
          <input value={bank} onChange={(e) => setBank(e.target.value)} inputMode="decimal" />
        </label>
        <label><div className="lab">Model Probability (0–1)</div>
          <input value={p} onChange={(e) => setP(e.target.value)} inputMode="decimal" />
        </label>
        <label><div className="lab">Odds (decimal)</div>
          <input value={odds} onChange={(e) => setOdds(e.target.value)} inputMode="decimal" />
        </label>
      </div>
      <div className="kelly-out">
        <b>Kelly f*:</b> {(k.f * 100).toFixed(2)}% &nbsp; | &nbsp; <b>Stake:</b> £{k.stake.toFixed(2)}
      </div>

      <style jsx="true">{`
        .kelly-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        .lab { font-size: 12px; color: rgba(255,255,255,.75); margin-bottom: 4px; }
        input { width: 100%; padding: 8px 10px; border-radius: 8px;
                border: 1px solid rgba(255,255,255,.18); background: #0f1110; color: #eaf4ed; }
        .kelly-out { margin-top: 8px; font-weight: 700; }
        @media (max-width: 700px) { .kelly-grid { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, isFinite(x) ? x : 0)); }