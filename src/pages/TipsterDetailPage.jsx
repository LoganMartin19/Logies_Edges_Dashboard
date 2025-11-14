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
  followTipster,
  unfollowTipster,
} from "../api";

/* ---------------- helpers ---------------- */
const number = (x, d = 2) =>
  typeof x === "number" && isFinite(x) ? x.toFixed(d) : "—";

const percent = (x, d = 1) =>
  typeof x === "number" && isFinite(x) ? (x * 100).toFixed(d) : "—";

/** Normalize a rate that might be sent as 50 (percent) instead of 0.5 (fraction) */
const normalizeRate = (v) => {
  if (typeof v !== "number" || !isFinite(v)) return 0;
  if (v > 1 || v < -1) return v / 100;
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

/* --------------- mini performance chart --------------- */

const MiniChart = ({ points }) => {
  if (!points || points.length === 0) {
    return (
      <div className="miniChartWrapper">
        <div className="miniChartEmpty">Not enough settled picks yet.</div>
      </div>
    );
  }

  const width = 260;
  const height = 80;

  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const range = max - min || 1;

  const stepX = points.length > 1 ? width / (points.length - 1) : width;

  const coords = points
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  // baseline at profit = 0
  const zeroY = height - ((0 - min) / range) * height;

  return (
    <div className="miniChartWrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="miniChartSvg">
        {/* baseline */}
        <line
          x1="0"
          y1={zeroY}
          x2={width}
          y2={zeroY}
          className="miniChartBaseline"
        />
        {/* profit line */}
        <polyline
          points={coords}
          className="miniChartLine"
          fill="none"
        />
      </svg>
    </div>
  );
};

/* --------------- main page --------------- */
export default function TipsterDetailPage() {
  const { username } = useParams();
  const nav = useNavigate();

  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);
  const [accas, setAccas] = useState([]);
  const [busyPickId, setBusyPickId] = useState(null);
  const [busyAccaId, setBusyAccaId] = useState(null);
  const [busyFollow, setBusyFollow] = useState(false);

  useEffect(() => {
    fetchTipster(username).then(setTipster).catch(() => setTipster(null));
    fetchTipsterPicks(username).then(setPicks).catch(() => setPicks([]));
    fetchTipsterAccas(username).then(setAccas).catch(() => setAccas([]));
  }, [username]);

  // 🔑 All hooks BEFORE any early return
  const fxMap = useFixturesMap(picks);
  const localStats = useLocalRollingFromPicks(picks);

  const perfSeries = useMemo(() => {
    if (!Array.isArray(picks) || picks.length === 0) return [];
    const ordered = [...picks].sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return ta - tb;
    });
    let cumulative = 0;
    const series = [];
    for (const p of ordered) {
      const profit = Number(p.profit ?? 0) || 0;
      cumulative += profit;
      series.push(cumulative);
    }
    return series;
  }, [picks]);

  if (!tipster) return <div>Loading…</div>;

  const isOwner = !!tipster.is_owner;
  const socials = tipster.social_links || {};

  const roiVal =
    tipster.roi_30d != null ? normalizeRate(tipster.roi_30d) : localStats.roi;
  const wrVal =
    tipster.winrate_30d != null ? normalizeRate(tipster.winrate_30d) : localStats.winrate;
  const profitVal =
    typeof tipster.profit_30d === "number" && tipster.profit_30d !== 0
      ? tipster.profit_30d
      : localStats.profit;
  const picks30d =
    typeof tipster.picks_30d === "number" && tipster.picks_30d > 0
      ? tipster.picks_30d
      : localStats.settled;

  const verified = !!tipster.is_verified;

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

  const handleToggleFollow = async () => {
    if (!tipster || isOwner || busyFollow) return;
    try {
      setBusyFollow(true);
      if (tipster.is_following) {
        const res = await unfollowTipster(tipster.username);
        setTipster((prev) =>
          prev
            ? {
                ...prev,
                is_following: false,
                follower_count:
                  typeof res.follower_count === "number"
                    ? res.follower_count
                    : Math.max(0, (prev.follower_count || 0) - 1),
              }
            : prev
        );
      } else {
        const res = await followTipster(tipster.username);
        setTipster((prev) =>
          prev
            ? {
                ...prev,
                is_following: true,
                follower_count:
                  typeof res.follower_count === "number"
                    ? res.follower_count
                    : (prev.follower_count || 0) + 1,
              }
            : prev
        );
      }
    } catch (e) {
      console.error("Follow toggle failed", e);
    } finally {
      setBusyFollow(false);
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
          <h2 style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span>{tipster.name}</span>
            {verified && <span className="verifiedBadge">VERIFIED</span>}
            {!isOwner && (
              <button
                onClick={handleToggleFollow}
                className="btnSmall btnFollow"
                disabled={busyFollow}
              >
                {tipster.is_following ? "Following" : "Follow"}
              </button>
            )}
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

          {(socials.twitter || socials.instagram) && (
            <div className="socialRow">
              {socials.twitter && (
                <a
                  href={
                    socials.twitter.startsWith("http")
                      ? socials.twitter
                      : `https://x.com/${socials.twitter.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  X / Twitter
                </a>
              )}
              {socials.instagram && (
                <a
                  href={
                    socials.instagram.startsWith("http")
                      ? socials.instagram
                      : `https://instagram.com/${socials.instagram.replace(/^@/, "")}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              )}
            </div>
          )}

          <div className="metrics">
            <span>ROI: {percent(roiVal)}%</span>
            <span>Profit: {number(profitVal)}</span>
            <span>Winrate: {percent(wrVal)}%</span>
            <span>Followers: {tipster.follower_count ?? 0}</span>
            {tipster.sport_focus && (
              <span className="sportFocus">{(tipster.sport_focus || "").toUpperCase()}</span>
            )}
          </div>

          {/* Performance card with mini graph */}
          <div className="perfCard">
            <div className="perfHeader">
              <span>Last 30 days</span>
              <span className="perfSummary">
                ROI {percent(roiVal)}% • Profit {number(profitVal)} • {picks30d} picks
              </span>
            </div>
            <MiniChart points={perfSeries} />
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
                  <td>
                    <ResultBadge result={p.result} />
                  </td>
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
                      <td>
                        <ResultBadge result={a.result} />
                      </td>
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
        .profile { display:flex; gap:16px; align-items:flex-start; margin-bottom:20px; }
        .avatar { width:80px; height:80px; border-radius:50%; }
        .metrics { display:flex; gap:12px; font-size:.9rem; margin-top:8px; flex-wrap:wrap; }

        .verifiedBadge {
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.72rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          border: 1px solid #9be7ff;
          background: rgba(155,231,255,0.1);
          color: #9be7ff;
        }

        .sportFocus {
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
          border: 1px solid rgba(255,255,255,.2);
          background: rgba(255,255,255,.06);
        }

        .perfCard {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          background: #071710;
          border: 1px solid rgba(155,231,255,0.18);
        }

        .perfHeader {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
          font-size:0.8rem;
          color: rgba(255,255,255,.8);
          margin-bottom:4px;
        }

        .perfHeader span:first-child {
          font-weight:600;
          text-transform:uppercase;
          letter-spacing:0.06em;
          font-size:0.72rem;
        }

        .perfSummary {
          font-size:0.78rem;
          opacity:0.85;
        }

        .miniChartWrapper {
          margin-top:4px;
          width:100%;
          max-width:320px;
        }

        .miniChartSvg {
          width:100%;
          height:80px;
          overflow:visible;
        }

        .miniChartBaseline {
          stroke: rgba(255,255,255,.15);
          stroke-width:1;
          stroke-dasharray:3 3;
        }

        .miniChartLine {
          stroke: #4caf50;
          stroke-width:2;
        }

        .miniChartEmpty {
          font-size:0.8rem;
          color:rgba(255,255,255,.7);
        }

        .socialRow {
          display:flex;
          gap:12px;
          margin-top:6px;
          font-size:0.9rem;
        }
        .socialRow a {
          color:#9be7ff;
          text-decoration:none;
        }
        .socialRow a:hover {
          text-decoration:underline;
        }

        .tableWrap { background:#0a0f0c; border-radius:12px; overflow-x:auto; }
        table.picks { width:100%; border-collapse:collapse; }
        .picks thead th {
          text-align:left;
          padding:8px 6px;
          border-bottom:1px solid rgba(255,255,255,.12);
          font-size:14px;
          color:#eaf4ed;
          background:rgba(255,255,255,.06);
          white-space:nowrap;
        }
        .picks td {
          padding:10px 6px;
          border-bottom:1px solid rgba(255,255,255,.08);
          font-size:14px;
          color:#eaf4ed;
        }

        .btnSmall { padding:6px 10px; border-radius:8px; background:#2e7d32; color:#fff; border:0; cursor:pointer; }
        .btnGhost { background:transparent; border:1px solid #2e7d32; color:#2e7d32; }
        .btnDanger { background:#a52727; }
        .btnSmall[disabled] { opacity:.6; cursor:not-allowed; }

        .btnFollow {
          background:#1c2933;
          border:1px solid #9be7ff;
          color:#9be7ff;
        }
        .btnFollow:hover:enabled {
          background:#163040;
        }

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