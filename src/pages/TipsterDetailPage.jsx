// src/pages/TipsterDetailPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  fetchTipster,
  fetchTipsterPicks,
  fetchFixture,
  fetchTipsterAccas,
  settleTipsterPick,
  deleteTipsterPick,
  settleTipsterAcca,
  deleteTipsterAcca,
} from "../api";

/* ---------------- helpers ---------------- */
const number = (x, d = 2) =>
  typeof x === "number" && isFinite(x) ? x.toFixed(d) : "—";

const percent = (x, d = 1) =>
  typeof x === "number" && isFinite(x) ? (x * 100).toFixed(d) : "—";

/** Normalize a rate that might be sent as 50 (percent) instead of 0.5 (fraction) */
const normalizeRate = (v) => {
  if (typeof v !== "number" || !isFinite(v)) return 0;
  if (v > 1 || v < -1) return v / 100; // treat as already percent
  return v;
};

/** Compute 30d-style rolling stats from picks as a fallback */
const useLocalRollingFromPicks = (picks) =>
  useMemo(() => {
    if (!Array.isArray(picks) || picks.length === 0) {
      return { roi: 0, winrate: 0, profit: 0, picksCount: 0, settled: 0 };
    }
    let profit = 0;
    let stakeSum = 0;
    let wins = 0;
    let settled = 0;

    for (const p of picks) {
      const stake = Number(p?.stake ?? 0) || 0;
      const price = Number(p?.price ?? 0) || 0;
      const res = (p?.result || "").toUpperCase();

      if (res) {
        settled += 1;
        if (res === "WIN") {
          wins += 1;
          profit += stake * (price - 1.0);
          stakeSum += stake;
        } else if (res === "LOSE") {
          profit -= stake;
          stakeSum += stake;
        }
      }
    }

    const roi = stakeSum > 0 ? profit / stakeSum : 0;
    const winrate = settled > 0 ? wins / settled : 0;
    return { roi, winrate, profit, picksCount: picks.length, settled };
  }, [picks]);

/* --------------- data helpers --------------- */
const useFixturesMap = (picks) => {
  const [map, setMap] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = [...new Set((picks || []).map((p) => p.fixture_id))].filter(Boolean);
      const out = {};
      for (const id of ids) {
        try {
          out[id] = await fetchFixture(id);
        } catch {}
      }
      if (!cancelled) setMap(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [picks]);
  return map;
};

/* --------------- small UI bits --------------- */
const TeamCell = ({ fixture, homeName, awayName }) => {
  const h = fixture?.home ?? { name: homeName };
  const a = fixture?.away ?? { name: awayName };

  const Logo = ({ src, name }) => (
    <img
      src={src || "/badge.png"}
      alt={name || ""}
      style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain" }}
      onError={(e) => (e.currentTarget.style.visibility = "hidden")}
    />
  );

  const left = h.name || "Home";
  const right = a.name || "Away";

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Logo src={h.logo} name={left} />
      <span style={{ fontWeight: 600 }}>{left}</span>
      <span style={{ opacity: 0.7 }}>vs</span>
      <span style={{ fontWeight: 600 }}>{right}</span>
      <Logo src={a.logo} name={right} />
    </div>
  );
};

const ResultBadge = ({ result }) => {
  if (!result) return <span className="badge neutral">—</span>;
  const cls =
    result === "WIN"
      ? "win"
      : result === "LOSE"
      ? "lose"
      : result === "PUSH"
      ? "push"
      : result === "VOID"
      ? "void"
      : "neutral";
  return <span className={`badge ${cls}`}>{result}</span>;
};

const SettleButtons = ({ onSettle, disabled }) => (
  <div className="settleRow">
    {["WIN", "LOSE", "PUSH", "VOID"].map((r) => (
      <button
        key={r}
        className={`btnTag ${r.toLowerCase()}`}
        disabled={disabled}
        onClick={() => onSettle(r)}
      >
        {r}
      </button>
    ))}
  </div>
);

/* --------------- main page --------------- */
export default function TipsterDetailPage() {
  const { username } = useParams();
  const nav = useNavigate();

  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);
  const [accas, setAccas] = useState([]);
  const [busyPickId, setBusyPickId] = useState(null);
  const [busyAccaId, setBusyAccaId] = useState(null);

  useEffect(() => {
    fetchTipster(username).then(setTipster).catch(() => setTipster(null));
    fetchTipsterPicks(username).then(setPicks).catch(() => setPicks([]));
    fetchTipsterAccas(username).then(setAccas).catch(() => setAccas([]));
  }, [username]);

  const fxMap = useFixturesMap(picks);
  const localStats = useLocalRollingFromPicks(picks);
  if (!tipster) return <div>Loading…</div>;
  const isOwner = !!tipster.is_owner;

  const roiVal =
    tipster.roi_30d != null ? normalizeRate(tipster.roi_30d) : localStats.roi;
  const wrVal =
    tipster.winrate_30d != null ? normalizeRate(tipster.winrate_30d) : localStats.winrate;
  const profitVal =
    typeof tipster.profit_30d === "number" && tipster.profit_30d !== 0
      ? tipster.profit_30d
      : localStats.profit;

  // ---------- handlers ----------
  const handleSettlePick = async (pick, result) => {
    try {
      setBusyPickId(pick.id);
      const updated = await settleTipsterPick(pick.id, result);
      setPicks((prev) => prev.map((p) => (p.id === pick.id ? { ...p, ...updated } : p)));
    } finally {
      setBusyPickId(null);
    }
  };

  const handleDeletePick = async (pick) => {
    if (!pick?.can_delete) return;
    if (!window.confirm("Delete this pick?")) return;
    try {
      setBusyPickId(pick.id);
      await deleteTipsterPick(pick.id);
      setPicks((prev) => prev.filter((p) => p.id !== pick.id));
    } finally {
      setBusyPickId(null);
    }
  };

  const handleSettleAcca = async (acca, result) => {
    try {
      setBusyAccaId(acca.id);
      const updated = await settleTipsterAcca(acca.id, result);
      setAccas((prev) => prev.map((a) => (a.id === acca.id ? { ...a, ...updated } : a)));
    } finally {
      setBusyAccaId(null);
    }
  };

  const handleDeleteAcca = async (acca) => {
    if (!acca?.can_delete) return;
    if (!window.confirm("Delete this acca?")) return;
    try {
      setBusyAccaId(acca.id);
      await deleteTipsterAcca(acca.id);
      setAccas((prev) => prev.filter((a) => a.id !== acca.id));
    } finally {
      setBusyAccaId(null);
    }
  };

  return (
    <div className="page">
      <Link to="/tipsters">← Back</Link>

      <div className="profile">
        <img
          src={
            tipster.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              tipster.name || tipster.username
            )}`
          }
          alt={tipster.name}
          className="avatar"
        />
        <div>
          <h2 style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {tipster.name} {tipster.is_verified && "✅"}
            {isOwner && (
              <>
                <button
                  onClick={() => nav(`/tipsters/${tipster.username}/new-pick`)}
                  className="btnSmall"
                >
                  + Add Pick
                </button>
                <button
                  onClick={() => nav(`/tipsters/${tipster.username}/new-acca`)}
                  className="btnSmall btnGhost"
                >
                  + New Acca
                </button>
              </>
            )}
          </h2>
          <p>@{tipster.username}</p>
          <p>{tipster.bio}</p>

          <div className="metrics">
            <span>ROI: {percent(roiVal)}%</span>
            <span>Profit: {number(profitVal)}</span>
            <span>Winrate: {percent(wrVal)}%</span>
          </div>
        </div>
      </div>

      <h3>Recent Picks</h3>
      <div className="tableWrap">
        <table className="picks">
          <thead>
            <tr>
              <th>Fixture</th>
              <th>Market</th>
              <th>Bookmaker</th>
              <th>Odds</th>
              <th>Stake</th>
              <th>Result</th>
              <th style={{ textAlign: "right" }}>EV</th>
              <th style={{ textAlign: "right" }}>Profit</th>
              {isOwner && <th style={{ width: 220 }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {picks.map((p) => {
              const fx = fxMap[p.fixture_id];
              const settled = !!p.result;
              return (
                <tr key={p.id}>
                  <td>
                    <Link
                      to={`/fixture/${p.fixture_id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <TeamCell fixture={fx} homeName={p.home_name} awayName={p.away_name} />
                    </Link>
                  </td>
                  <td>{p.market}</td>
                  <td>{p.bookmaker || "—"}</td>
                  <td>{number(p.price)}</td>
                  <td>{number(p.stake)}</td>
                  <td><ResultBadge result={p.result} /></td>
                  <td
                    style={{
                      textAlign: "right",
                      color: (p.model_edge ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                    }}
                  >
                    {p.model_edge == null ? "—" : number(p.model_edge * 100, 1) + "%"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      color: (p.profit ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                    }}
                  >
                    {number(p.profit)}
                  </td>
                  {isOwner && (
                    <td>
                      <div className="actionsCell">
                        {!settled && (
                          <SettleButtons
                            disabled={busyPickId === p.id}
                            onSettle={(res) => handleSettlePick(p, res)}
                          />
                        )}
                        {p.can_delete && (
                          <button
                            className="btnSmall btnDanger"
                            disabled={busyPickId === p.id}
                            onClick={() => handleDeletePick(p)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {accas.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Accas</h3>
          <div className="tableWrap">
            <table className="picks">
              <thead>
                <tr>
                  <th>Acca</th>
                  <th>Legs</th>
                  <th>Combined</th>
                  <th>Stake</th>
                  <th>Result</th>
                  <th style={{ textAlign: "right" }}>Profit</th>
                  {isOwner && <th style={{ width: 220 }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {accas.map((a) => {
                  const settled = !!a.result;
                  return (
                    <tr key={a.id}>
                      <td>#{a.id}</td>
                      <td>
                        <div style={{ display: "grid", gap: 6 }}>
                          {a.legs.map((leg, i) => (
                            <Link
                              key={`${a.id}-${i}`}
                              to={`/fixture/${leg.fixture_id}`}
                              style={{ textDecoration: "none", color: "inherit" }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ opacity: 0.7 }}>{i + 1}.</span>
                                <span style={{ fontWeight: 600 }}>{leg.home_name}</span>
                                <span style={{ opacity: 0.7 }}>vs</span>
                                <span style={{ fontWeight: 600 }}>{leg.away_name}</span>
                                <span style={{ marginLeft: 8, opacity: 0.75 }}>{leg.market}</span>
                                <span style={{ marginLeft: "auto", opacity: 0.85 }}>
                                  {number(leg.price)}
                                </span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </td>
                      <td>{number(a.combined_price)}</td>
                      <td>{number(a.stake)}</td>
                      <td><ResultBadge result={a.result} /></td>
                      <td
                        style={{
                          textAlign: "right",
                          color: (a.profit ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                        }}
                      >
                        {number(a.profit)}
                      </td>
                      {isOwner && (
                        <td>
                          <div className="actionsCell">
                            {!settled && (
                              <SettleButtons
                                disabled={busyAccaId === a.id}
                                onSettle={(res) => handleSettleAcca(a, res)}
                              />
                            )}
                            {a.can_delete && (
                              <button
                                className="btnSmall btnDanger"
                                disabled={busyAccaId === a.id}
                                onClick={() => handleDeleteAcca(a)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

<style jsx="true">{`
  .profile { display:flex; gap:16px; align-items:center; margin-bottom:20px; }
  .avatar { width:80px; height:80px; border-radius:50%; }
  .metrics { display:flex; gap:12px; font-size:.9rem; margin-top:8px; }

  /* ✅ Tables + sticky header (Safari/iPad safe, no white bar) */
  .tableWrap {
    position: relative;
    background:#0c331f;      /* solid behind the header */
    overflow-x:auto;
    border-radius:6px;
  }

  table { width:100%; border-collapse:separate; border-spacing:0; margin-top:12px; }
  th, td { border-bottom:1px solid #1e2b21; padding:10px; vertical-align:top; }
  .picks { background:#0a0f0c; }

  /* Make EACH TH sticky and overlap the top by 1px to hide the seam */
  th {
    position: sticky;
    top: -1px;               /* <— hides the white line on Safari */
    z-index: 3;
    background:#0c331f;      /* must be solid */
    color:#fff;
    text-align:left;
  }

  /* optional subtle bottom divider for the header */
  thead tr { background:#0c331f; }  /* some Safari versions look at the row bg */

  .picks { background:#0a0f0c; }

  .btnSmall { padding:6px 10px; border-radius:8px; background:#2e7d32; color:#fff; border:0; cursor:pointer; }
  .btnGhost { background:transparent; border:1px solid #2e7d32; color:#2e7d32; }
  .btnDanger { background:#a52727; }
  .btnSmall[disabled] { opacity:.6; cursor:not-allowed; }

  .actionsCell { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
  .settleRow { display:flex; gap:6px; flex-wrap:wrap; }

  .btnTag { padding:4px 8px; border-radius:999px; font-size:.8rem; border:0; cursor:pointer; }
  .btnTag.win { background:#124b27; color:#b6f2c6; }
  .btnTag.lose { background:#4b1212; color:#f2b6b6; }
  .btnTag.push { background:#1f2a44; color:#c8d7ff; }
  .btnTag.void { background:#3b3b3b; color:#e7e7e7; }
  .btnTag:disabled { opacity:.6; cursor:not-allowed; }

  .badge { padding:2px 8px; border-radius:999px; font-size:.75rem; }
  .badge.win { background:#124b27; color:#b6f2c6; }
  .badge.lose { background:#4b1212; color:#f2b6b6; }
  .badge.push { background:#1f2a44; color:#c8d7ff; }
  .badge.void { background:#3b3b3b; color:#e7e7e7; }
  .badge.neutral { background:#263238; color:#e0e0e0; }
`}</style>
    </div>
  );
}