// src/components/FeaturedRecord.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../components/AuthGate";

/* ------------ small badge pill in the header ------------- */
const pill = {
  display: "inline-flex",
  gap: 10,
  alignItems: "baseline",
  background: "rgba(255,255,255,.1)",
  borderRadius: 999,
  padding: "6px 12px",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};
const small = { fontSize: 12, opacity: 0.9, fontWeight: 500 };

/* super-tolerant fixture extractor */
const getMatch = (p = {}) => {
  const s = (x) => (typeof x === "string" && x.trim() ? x.trim() : "");
  return (
    s(p.match) ||
    s(p.matchup) ||
    (s(p.home_team) && s(p.away_team) ? `${p.home_team} v ${p.away_team}` : "—")
  );
};

export default function FeaturedRecord({ span = "30d" }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const { isPremium } = useAuth(); // 🔐 use same flag as PublicDashboard

  useEffect(() => {
    let alive = true;
    api
      .get("/api/public/picks/record", { params: { span } })
      .then(({ data }) => alive && setData(data))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [span]);

  // lock page scroll while drawer open (iOS/desktop-safe)
  useEffect(() => {
    if (!open) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [open]);

  if (!data) return null;

  // ----- NEW: recompute summary ONLY from settled picks -----
  const allPicks = data.picks || [];

  const settledPicks = allPicks.filter((p) => {
    const res = (p.result || "").toLowerCase();
    return res === "won" || res === "lost" || res === "void";
  });

  // If literally nothing is settled yet, fall back to empty stats
  const base = settledPicks;

  let staked = 0;
  let returned = 0;
  let won = 0;
  let lost = 0;
  let voided = 0;

  base.forEach((p) => {
    const res = (p.result || "").toLowerCase();
    const stake = +p.stake || 0;
    const price = +p.price || 0;

    staked += stake;

    if (res === "won") {
      won += 1;
      returned += stake * price; // full return incl stake
    } else if (res === "lost") {
      lost += 1;
      // returned += 0
    } else if (res === "void") {
      voided += 1;
      returned += stake; // stake refunded
    }
  });

  const pnl = returned - staked;
  const roiNum = staked > 0 ? (pnl / staked) * 100 : 0;
  const roi = roiNum.toFixed(1);
  const rec = `${won}W-${lost}L-${voided}V`;
  const settledCount = base.length;

  return (
    <>
      {/* HEADER BADGE */}
      <div style={pill} onClick={() => setOpen(true)} title="Click for details">
        <span>Record: {rec}</span>
        <span style={small}>ROI {roi}%</span>
        <span style={small}>
          ({settledCount} settled picks / {span})
        </span>
      </div>

      {/* DRAWER */}
      {open && (
        <div className="rec-overlay" role="dialog" aria-modal="true">
          {/* backdrop under the panel (click to close) */}
          <div className="rec-backdrop" onClick={() => setOpen(false)} />

          {/* panel above the backdrop */}
          <div className="rec-panel" onClick={(e) => e.stopPropagation()}>
            <div className="rec-head">
              <div style={{ fontWeight: 800, fontSize: 18, color: "#eaf4ed" }}>
                Featured Picks — {span}
              </div>
              <button className="rec-close" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>

            {/* scrollable body */}
            <div className="rec-body">
              {/* KPIs – also based on settled picks only */}
              <div className="rec-kpis">
                <div>
                  <b>Staked:</b> £{staked.toFixed(2)}
                </div>
                <div>
                  <b>Returned:</b> £{returned.toFixed(2)}
                </div>
                <div>
                  <b>P/L:</b> £{pnl.toFixed(2)}
                </div>
                <div>
                  <b>ROI:</b> {roi}%
                </div>
                <div>
                  <b>Record:</b> {rec}
                </div>
                <div>
                  <b>Settled picks:</b> {settledCount}
                </div>
              </div>

              {/* TABLE */}
              <div className="rec-scroll">
                <table className="rec-table">
                  <thead>
                    <tr>
                      <th className="fixture">Fixture</th>
                      <th>Comp</th>
                      <th>Market</th>
                      <th className="col-book">Book</th>
                      <th className="col-num" style={{ textAlign: "right" }}>
                        Odds
                      </th>
                      <th className="col-num" style={{ textAlign: "right" }}>
                        Stake
                      </th>
                      <th className="col-num" style={{ textAlign: "right" }}>
                        Result
                      </th>
                      <th className="col-num" style={{ textAlign: "right" }}>
                        Units
                      </th>
                      <th>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPicks.map((p) => {
                      const match = getMatch(p);
                      const comp = p.league || p.comp || "—";
                      const stake = +p.stake || 0;
                      const price = +p.price || 0;
                      const res = (p.result || "").toLowerCase();
                      let units = 0;
                      if (res === "won") units = stake * (price - 1);
                      else if (res === "lost") units = -stake;

                      const locked = p.is_premium_only && !isPremium; // 🔒 same pattern

                      return (
                        <tr
                          key={p.pick_id}
                          style={{
                            borderTop: "1px solid rgba(255,255,255,.08)",
                          }}
                        >
                          {/* Fixture + comp always visible */}
                          <td className="fixture">{match}</td>
                          <td>{comp}</td>

                          {/* Market cell – lock if premium-only and user not premium */}
                          <td>
                            {locked ? (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 6,
                                  fontSize: 12,
                                }}
                              >
                                <span style={{ opacity: 0.9 }}>
                                  Premium pick
                                </span>
                                <span
                                  style={{
                                    padding: "2px 6px",
                                    borderRadius: 999,
                                    background: "rgba(255,255,255,0.06)",
                                    border:
                                      "1px solid rgba(251,191,36,0.7)",
                                    color: "#FBBF24",
                                    fontSize: 10,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  🔒
                                </span>
                                <Link
                                  to="/premium"
                                  style={{
                                    color: "#FBBF24",
                                    textDecoration: "underline",
                                    fontSize: 11,
                                  }}
                                >
                                  Unlock +
                                </Link>
                              </span>
                            ) : (
                              p.market || "—"
                            )}
                          </td>

                          <td className="col-book">
                            {locked ? "—" : p.bookmaker || "—"}
                          </td>

                          <td className="col-num">
                            {locked
                              ? "—"
                              : price
                              ? price.toFixed(2)
                              : "—"}
                          </td>

                          <td className="col-num">
                            {locked
                              ? "—"
                              : stake
                              ? stake.toFixed(2)
                              : "—"}
                          </td>

                          <td
                            className="col-num"
                            style={{
                              color: locked
                                ? "#bbb"
                                : res === "won"
                                ? "#5efc82"
                                : res === "lost"
                                ? "#ff6b6b"
                                : "#bbb",
                            }}
                          >
                            {locked ? "—" : res || "—"}
                          </td>

                          <td
                            className="col-num"
                            style={{
                              color: locked
                                ? "#bbb"
                                : units > 0
                                ? "#5efc82"
                                : units < 0
                                ? "#ff6b6b"
                                : "#bbb",
                            }}
                          >
                            {locked
                              ? "—"
                              : units
                              ? units.toFixed(2)
                              : "0.00"}
                          </td>

                          <td>{locked ? "—" : p.note || ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* KELLY */}
              <div className="rec-card" style={{ marginTop: 16 }}>
                <div className="rec-subtitle">Kelly Stake Calculator</div>
                <KellyWidget />
              </div>

              {/* spacer to clear iOS toolbar on mobile */}
              <div className="rec-spacer" />
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style jsx="true">{`
        .rec-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: end center;
        }
        .rec-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.45);
          z-index: 1;
        }
        .rec-panel {
          position: relative;
          z-index: 2;
          width: min(980px, 100%);
          max-height: 88vh;
          background: #0f1110;
          color: #eaf4ed;
          border-top-left-radius: 16px;
          border-top-right-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.35);
          padding: 12px;
          display: flex;
          flex-direction: column;
        }
        .rec-head {
          display: flex;
          align-items: center;
          gap: 8px;
          position: sticky;
          top: 0;
          padding: 6px 0 10px 0;
          background: linear-gradient(
            180deg,
            rgba(15, 17, 16, 1) 70%,
            rgba(15, 17, 16, 0) 100%
          );
          z-index: 3;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .rec-close {
          margin-left: auto;
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: #111;
          color: #fff;
          cursor: pointer;
        }
        .rec-muted {
          color: rgba(255, 255, 255, 0.75);
        }

        .rec-kpis {
          display: flex;
          gap: 18px;
          margin: 12px 0 8px;
          flex-wrap: wrap;
        }

        .rec-body {
          min-height: 0;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          touch-action: pan-y;
        }

        .rec-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .rec-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }
        .rec-table thead th {
          text-align: left;
          font-weight: 700;
          padding: 10px 8px;
          font-size: 13px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
        }
        .rec-table tbody td {
          padding: 12px 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 14px;
        }
        .rec-table .fixture {
          min-width: 220px;
        }
        .rec-table .col-book {
          white-space: nowrap;
        }
        .rec-table .col-num {
          text-align: right;
        }

        .rec-card {
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 12px;
        }
        .rec-subtitle {
          font-weight: 700;
          margin-bottom: 8px;
        }

        @media (max-width: 700px) {
          .rec-panel {
            width: 100vw;
            height: 100dvh;
            max-height: none;
            inset: 0;
            border-radius: 0;
            padding: calc(10px + env(safe-area-inset-top)) 10px
              calc(28px + env(safe-area-inset-bottom) + 96px);
          }
          .rec-table {
            min-width: 620px;
          }
          .rec-spacer {
            height: 96px;
          }
        }
      `}</style>
    </>
  );
}

/* ---------------- Kelly widget (dark + responsive) ---------------- */
function KellyWidget() {
  const [bankroll, setBankroll] = useState(1000);
  const [prob, setProb] = useState(0.55);
  const [odds, setOdds] = useState(1.91);
  const [half, setHalf] = useState(true);

  const b = Math.max(0, odds - 1);
  const p = Math.min(0.9999, Math.max(0, prob));
  const q = 1 - p;
  const kelly = b > 0 ? Math.max(0, (b * p - q) / b) : 0;
  const frac = half ? kelly / 2 : kelly;
  const stake = bankroll * frac;

  return (
    <>
      <div className="kelly-grid">
        <label>
          <div className="lab">Bankroll (£)</div>
          <input
            value={bankroll}
            onChange={(e) => setBankroll(+e.target.value || 0)}
            inputMode="decimal"
          />
        </label>
        <label>
          <div className="lab">Model Probability (0–1)</div>
          <input
            value={prob}
            onChange={(e) => setProb(+e.target.value || 0)}
            inputMode="decimal"
          />
        </label>
        <label>
          <div className="lab">Odds (decimal)</div>
          <input
            value={odds}
            onChange={(e) => setOdds(+e.target.value || 0)}
            inputMode="decimal"
          />
        </label>
        <label>
          <div className="lab">Fraction</div>
          <label
            style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={half}
              onChange={() => setHalf(!half)}
            />{" "}
            Use half-Kelly
          </label>
        </label>
      </div>
      <div className="kelly-out">
        <b>Kelly f*:</b> {(kelly * 100).toFixed(2)}% &nbsp;|&nbsp;{" "}
        <b>Stake:</b> £{stake.toFixed(2)}
      </div>

      <style jsx="true">{`
        .kelly-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        .lab {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 4px;
        }
        input {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: #0f1110;
          color: #eaf4ed;
        }
        .kelly-out {
          margin-top: 8px;
          font-weight: 700;
        }
        @media (max-width: 700px) {
          .kelly-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}