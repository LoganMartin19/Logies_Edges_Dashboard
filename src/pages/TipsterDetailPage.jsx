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
  fetchTipsterSubscription,
  startTipsterSubscription,
  cancelTipsterSubscription,
} from "../api";
import { useAuth } from "../components/AuthGate";

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
      const ids = [...new Set((picks || []).map((p) => p.fixture_id))].filter(
        Boolean
      );
      const out = {};
      for (const id of ids) {
        try {
          out[id] = await fetchFixture(id);
        } catch {
          // ignore
        }
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
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        objectFit: "contain",
      }}
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

/* ------------ stats + chart helpers ----------- */

const RANGE_OPTIONS = [
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "60d", label: "Last 60 days", days: 60 },
  { id: "all", label: "All time", days: null },
];

const dateFromISO = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Compute stats for a tipster from picks (and fixtures map for comps).
 * All frontend-only so we don't touch the API right now.
 */
function computeTipsterStats(picks = [], fxMap = {}, rangeId = "30d") {
  if (!picks.length) {
    return {
      filtered: [],
      equity: [],
      summary: {
        picks: 0,
        staked: 0,
        returned: 0,
        profit: 0,
        roi: 0,
        winrate: 0,
      },
      streak: {
        longestWin: 0,
      },
      byMarket: [],
      byLeague: [],
    };
  }

  const rangeCfg =
    RANGE_OPTIONS.find((r) => r.id === rangeId) ?? RANGE_OPTIONS[0];
  const now = new Date();
  let cutoff = null;
  if (rangeCfg.days != null) {
    cutoff = new Date(now);
    cutoff.setDate(now.getDate() - rangeCfg.days);
  }

  const withDates = picks
    .map((p) => ({ ...p, createdAt: dateFromISO(p.created_at) }))
    .filter((p) => p.createdAt); // drop bad dates

  const filtered = cutoff
    ? withDates.filter((p) => p.createdAt >= cutoff)
    : withDates.slice();

  // Sort ascending for equity + streak
  filtered.sort((a, b) => a.createdAt - b.createdAt);

  let staked = 0;
  let returned = 0;
  let profit = 0;
  let wins = 0;
  let settled = 0;

  // equity curve (cumulative profit)
  const equity = [];
  let running = 0;

  for (const p of filtered) {
    const stake = Number(p.stake || 0);
    const res = (p.result || "").toUpperCase();
    const pProfit = Number(p.profit || 0);

    if (res) {
      settled++;
      staked += stake;
      profit += pProfit;
      if (res === "WIN") {
        wins++;
        returned += stake + pProfit;
      } else if (res === "LOSE") {
        returned += 0;
      } else {
        // PUSH/VOID: stake back
        returned += stake;
      }
      running += pProfit;
    }

    equity.push({
      t: p.createdAt,
      value: running,
    });
  }

  const roi = staked > 0 ? profit / staked : 0;
  const winrate = settled > 0 ? wins / settled : 0;

  // longest winning streak (all-time, irrespective of range)
  let longest = 0;
  let current = 0;
  const allSorted = withDates.slice().sort((a, b) => a.createdAt - b.createdAt);
  for (const p of allSorted) {
    const res = (p.result || "").toUpperCase();
    if (res === "WIN") {
      current += 1;
      if (current > longest) longest = current;
    } else if (res) {
      current = 0;
    }
  }

  // group by market
  const markets = {};
  for (const p of filtered) {
    const res = (p.result || "").toUpperCase();
    const key = p.market || "Other";
    const entry = (markets[key] = markets[key] || {
      market: key,
      picks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      staked: 0,
      profit: 0,
    });
    const stake = Number(p.stake || 0);
    const pProfit = Number(p.profit || 0);

    if (!res) continue;

    entry.picks += 1;
    entry.staked += stake;
    entry.profit += pProfit;
    if (res === "WIN") entry.wins += 1;
    else if (res === "LOSE") entry.losses += 1;
    else entry.pushes += 1;
  }

  const byMarket = Object.values(markets)
    .filter((m) => m.picks > 0)
    .map((m) => ({
      ...m,
      roi: m.staked > 0 ? m.profit / m.staked : 0,
    }))
    .sort((a, b) => b.picks - a.picks || (b.roi || 0) - (a.roi || 0));

  // group by league / competition (from fixtures)
  const leagues = {};
  for (const p of filtered) {
    const fx = fxMap[p.fixture_id];
    const comp = fx?.comp || fx?.league || "Other";
    const key = comp || "Other";

    const res = (p.result || "").toUpperCase();
    if (!res) continue;

    const entry = (leagues[key] = leagues[key] || {
      league: key,
      picks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      staked: 0,
      profit: 0,
    });

    const stake = Number(p.stake || 0);
    const pProfit = Number(p.profit || 0);
    entry.picks += 1;
    entry.staked += stake;
    entry.profit += pProfit;
    if (res === "WIN") entry.wins += 1;
    else if (res === "LOSE") entry.losses += 1;
    else entry.pushes += 1;
  }

  const byLeague = Object.values(leagues)
    .filter((l) => l.picks > 0)
    .map((l) => ({
      ...l,
      roi: l.staked > 0 ? l.profit / l.staked : 0,
    }))
    .sort((a, b) => b.picks - a.picks || (b.roi || 0) - (a.roi || 0));

  return {
    filtered,
    equity,
    summary: {
      picks: filtered.length,
      staked,
      returned,
      profit,
      roi,
      winrate,
    },
    streak: {
      longestWin: longest,
    },
    byMarket,
    byLeague,
  };
}

/** Simple inline sparkline */
function EquityChart({ points }) {
  if (!points || points.length < 2) return null;

  const width = 260;
  const height = 90;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.value);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(0, ...ys);
  const spanY = maxY - minY || 1;
  const spanX = xs[xs.length - 1] || 1;

  const path = points
    .map((p, i) => {
      const x = (i / spanX) * (width - 20) + 10;
      const y = height - ((p.value - minY) / spanY) * (height - 20) - 10;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  const lastVal = points[points.length - 1]?.value || 0;

  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id="equityStroke" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4caf50" />
          <stop offset="100%" stopColor="#1b5e20" />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="url(#equityStroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        r="4"
        fill={lastVal >= 0 ? "#4caf50" : "#ef5350"}
        cx={
          ((points.length - 1) / (xs[xs.length - 1] || 1)) * (width - 20) + 10
        }
        cy={
          height -
          ((lastVal - minY) / spanY) * (height - 20) -
          10
        }
      />
    </svg>
  );
}

/* --------------- main page --------------- */
export default function TipsterDetailPage() {
  const { username } = useParams();
  const nav = useNavigate();
  const { user, isPremium, loading } = useAuth(); // ⬅️ need user + loading

  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);
  const [accas, setAccas] = useState([]);
  const [busyPickId, setBusyPickId] = useState(null);
  const [busyAccaId, setBusyAccaId] = useState(null);
  const [busyFollow, setBusyFollow] = useState(false);
  const [range, setRange] = useState("30d");

  const [subInfo, setSubInfo] = useState(null); // tipster subscription info
  const [subLoading, setSubLoading] = useState(true);
  const [subBusy, setSubBusy] = useState(false);

  // ---------- base data ----------
  useEffect(() => {
    let cancelled = false;

    fetchTipster(username)
      .then((data) => {
        if (!cancelled) setTipster(data);
      })
      .catch(() => {
        if (!cancelled) setTipster(null);
      });

    fetchTipsterPicks(username)
      .then((data) => {
        if (!cancelled) setPicks(data);
      })
      .catch(() => {
        if (!cancelled) setPicks([]);
      });

    fetchTipsterAccas(username)
      .then((data) => {
        if (!cancelled) setAccas(data);
      })
      .catch(() => {
        if (!cancelled) setAccas([]);
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  // ---------- subscription status ----------
  useEffect(() => {
    let cancelled = false;

    // wait for Firebase auth to finish initialising
    if (loading) return;

    // guest viewer → no subscription info, but don't 401
    if (!user) {
      if (!cancelled) {
        setSubInfo(null);
        setSubLoading(false);
      }
      return;
    }

    (async () => {
      if (!cancelled) setSubLoading(true);
      try {
        const data = await fetchTipsterSubscription(username);
        if (!cancelled) {
          setSubInfo(data);
        }
      } catch (e) {
        // 401 or other error → treat as no subscription
        if (!cancelled) {
          setSubInfo(null);
        }
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username, user, loading]);

  const fxMap = useFixturesMap(picks);
  const localStats = useLocalRollingFromPicks(picks);
  const stats = useMemo(
    () => computeTipsterStats(picks, fxMap, range),
    [picks, fxMap, range]
  );

  if (!tipster) return <div>Loading…</div>;

  const isOwner = !!tipster.is_owner;
  const viewerCanSeePremium = isOwner || isPremium;
  const socials = tipster.social_links || {};

  const roiVal =
    tipster.roi_30d != null ? normalizeRate(tipster.roi_30d) : localStats.roi;
  const wrVal =
    tipster.winrate_30d != null
      ? normalizeRate(tipster.winrate_30d)
      : localStats.winrate;
  const profitVal =
    typeof tipster.profit_30d === "number" && tipster.profit_30d !== 0
      ? tipster.profit_30d
      : localStats.profit;

  const isSubscriber = !!subInfo?.is_subscriber;
  const hasPremium = picks.some((p) => p.is_premium_only);
  const hasSubscriberOnly = picks.some((p) => p.is_subscriber_only);

  const monthlyPrice =
    subInfo?.price_cents != null
      ? (subInfo.price_cents / 100).toFixed(2)
      : null;

  // ---------- subscription handlers ----------
  const handleSubscribe = async () => {
    if (subBusy) return;
    try {
      setSubBusy(true);
      const data = await startTipsterSubscription(username);
      setSubInfo(data);
    } catch (e) {
      if (e?.response?.status === 401) {
        nav("/login");
      } else {
        console.error("Subscribe failed", e);
        alert("Could not start subscription. Please try again.");
      }
    } finally {
      setSubBusy(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (subBusy) return;
    if (!window.confirm("Cancel your subscription to this tipster?")) return;
    try {
      setSubBusy(true);
      const data = await cancelTipsterSubscription(username);
      setSubInfo(data);
    } catch (e) {
      console.error("Cancel subscription failed", e);
      alert("Could not cancel subscription. Please try again.");
    } finally {
      setSubBusy(false);
    }
  };

  // ---------- pick / acca handlers ----------
  const handleSettlePick = async (pick, result) => {
    try {
      setBusyPickId(pick.id);
      const updated = await settleTipsterPick(pick.id, result);
      setPicks((prev) =>
        prev.map((p) => (p.id === pick.id ? { ...p, ...updated } : p))
      );
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
      setAccas((prev) =>
        prev.map((a) => (a.id === acca.id ? { ...a, ...updated } : a))
      );
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

      {/* PROFILE HEADER */}
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
          <h2
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {tipster.name} {tipster.is_verified && "✅"}
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
                      : `https://instagram.com/${socials.instagram.replace(
                          /^@/,
                          ""
                        )}`
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  Instagram
                </a>
              )}
            </div>
          )}

          <div className="metricsRow">
            <span>ROI: {percent(roiVal)}%</span>
            <span>Profit: {number(profitVal)}</span>
            <span>Winrate: {percent(wrVal)}%</span>
            <span>Followers: {tipster.follower_count ?? 0}</span>
            {tipster.sport_focus && (
              <span className="focusPill">{tipster.sport_focus}</span>
            )}
          </div>

          {/* SUBSCRIPTION CARD */}
          {!isOwner && !subLoading && subInfo && monthlyPrice && (
            <div className="subCard" id="subscribe">
              <div>
                <div className="subLabel">Subscribe to {tipster.name}</div>
                <div className="subPrice">
                  £{monthlyPrice}
                  <span className="subPriceUnit">/ month</span>
                </div>
                <div className="subStatus">
                  {subInfo.subscriber_limit
                    ? `${subInfo.subscriber_count}/${subInfo.subscriber_limit} spots taken`
                    : `${subInfo.subscriber_count || 0} subscribers`}
                  {subInfo.is_open_for_new_subs === false && " • Currently full"}
                </div>
              </div>
              <div>
                {isSubscriber ? (
                  <button
                    className="btnSmall btnGhost"
                    disabled={subBusy}
                    onClick={handleCancelSubscription}
                  >
                    {subBusy ? "Cancelling…" : "Cancel subscription"}
                  </button>
                ) : (
                  <button
                    className="btnSmall"
                    disabled={
                      subBusy || subInfo.is_open_for_new_subs === false
                    }
                    onClick={handleSubscribe}
                  >
                    {subBusy
                      ? "Starting…"
                      : subInfo.is_open_for_new_subs === false
                      ? "Full"
                      : "Subscribe"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* STATS + CHART PANEL */}
      {picks.length > 0 && (
        <div className="statsPanel">
          <div className="statsHeader">
            <div>
              <div className="statsTitle">Performance</div>
              <div className="statsSubtitle">
                {RANGE_OPTIONS.find((r) => r.id === range)?.label ||
                  "Last 30 days"}
              </div>
            </div>
            <div className="rangeTabs">
              {RANGE_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  className={
                    r.id === range ? "rangeBtn rangeBtnActive" : "rangeBtn"
                  }
                  onClick={() => setRange(r.id)}
                >
                  {r.id === "all" ? "All time" : r.label.replace("Last ", "")}
                </button>
              ))}
            </div>
          </div>

          <div className="statsGrid">
            <div className="statsLeft">
              <div className="cardsRow">
                <div className="statCard">
                  <div className="label">Picks</div>
                  <div className="value">{stats.summary.picks}</div>
                </div>
                <div className="statCard">
                  <div className="label">Staked</div>
                  <div className="value">{number(stats.summary.staked)}</div>
                </div>
                <div className="statCard">
                  <div className="label">Returned</div>
                  <div className="value">{number(stats.summary.returned)}</div>
                </div>
                <div className="statCard">
                  <div className="label">P/L</div>
                  <div
                    className={
                      stats.summary.profit >= 0 ? "value good" : "value bad"
                    }
                  >
                    {number(stats.summary.profit)}
                  </div>
                </div>
                <div className="statCard">
                  <div className="label">ROI</div>
                  <div
                    className={
                      stats.summary.roi >= 0 ? "value good" : "value bad"
                    }
                  >
                    {percent(stats.summary.roi)}%
                  </div>
                </div>
              </div>

              <div className="streakRow">
                <span>Longest winning streak</span>
                <strong>{stats.streak.longestWin} bets</strong>
              </div>
            </div>

            <div className="statsRight">
              <div className="chartLabel">
                Equity (P/L) over time • {stats.summary.picks} picks
              </div>
              <EquityChart points={stats.equity} />
            </div>
          </div>

          <div className="splitTables">
            <div className="tableBlock">
              <div className="tableTitle">By market</div>
              {stats.byMarket.length === 0 ? (
                <div className="tableEmpty">Not enough settled bets yet.</div>
              ) : (
                <table className="miniTable">
                  <thead>
                    <tr>
                      <th>Market</th>
                      <th>Picks</th>
                      <th>Record</th>
                      <th style={{ textAlign: "right" }}>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byMarket.map((m) => (
                      <tr key={m.market}>
                        <td>{m.market}</td>
                        <td>{m.picks}</td>
                        <td>
                          {m.wins}W-{m.losses}L
                          {m.pushes ? `-${m.pushes}P` : ""}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            className={
                              m.roi >= 0 ? "roiBadge roiGood" : "roiBadge roiBad"
                            }
                          >
                            {percent(m.roi)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="tableBlock">
              <div className="tableTitle">By league / competition</div>
              {stats.byLeague.length === 0 ? (
                <div className="tableEmpty">Not enough settled bets yet.</div>
              ) : (
                <table className="miniTable">
                  <thead>
                    <tr>
                      <th>League</th>
                      <th>Picks</th>
                      <th>Record</th>
                      <th style={{ textAlign: "right" }}>ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byLeague.map((l) => (
                      <tr key={l.league}>
                        <td>{l.league}</td>
                        <td>{l.picks}</td>
                        <td>
                          {l.wins}W-{l.losses}L
                          {l.pushes ? `-${l.pushes}P` : ""}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span
                            className={
                              l.roi >= 0 ? "roiBadge roiGood" : "roiBadge roiBad"
                            }
                          >
                            {percent(l.roi)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECENT PICKS TABLE */}
      <h3>Recent Picks</h3>

      {/* small banner if there *are* premium picks but viewer can't see them */}
      {hasPremium && !viewerCanSeePremium && (
        <div
          style={{
            marginBottom: 8,
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(251,191,36,0.08)",
            border: "1px solid rgba(251,191,36,0.4)",
          }}
        >
          Some picks are <strong>locked as Premium</strong>.{" "}
          <Link
            to="/premium"
            style={{ color: "#FBBF24", textDecoration: "underline" }}
          >
            Unlock full card →
          </Link>
        </div>
      )}

      {/* banner if there are subscriber-only picks and viewer isn't subscribed */}
      {hasSubscriberOnly && !isOwner && !isSubscriber && (
        <div
          style={{
            marginBottom: 8,
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 8,
            background: "rgba(59,130,246,0.08)",
            border: "1px solid rgba(59,130,246,0.5)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span>
            Some picks are <strong>locked for subscribers only</strong>.
          </span>
          {monthlyPrice ? (
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={subBusy || subInfo?.is_open_for_new_subs === false}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                border: "none",
                background: "#3b82f6",
                color: "white",
                cursor: subBusy ? "default" : "pointer",
              }}
            >
              {subBusy
                ? "Starting…"
                : subInfo?.is_open_for_new_subs === false
                ? "Full"
                : `Subscribe £${monthlyPrice}/mo`}
            </button>
          ) : (
            <span style={{ opacity: 0.8 }}>
              Log in or subscribe to unlock.
            </span>
          )}
        </div>
      )}

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
              const isSubOnly = !!p.is_subscriber_only;
              const isPremOnly = !!p.is_premium_only;

              const locked =
                !isOwner &&
                ((isPremOnly && !viewerCanSeePremium) ||
                  (isSubOnly && !isSubscriber));

              return (
                <tr key={p.id}>
                  <td>
                    <Link
                      to={`/fixture/${p.fixture_id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <TeamCell
                        fixture={fx}
                        homeName={p.home_name}
                        awayName={p.away_name}
                      />
                    </Link>
                  </td>

                  {/* Market cell – lock if needed */}
                  <td>
                    {locked ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            opacity: 0.9,
                          }}
                        >
                          {isSubOnly && !isSubscriber && !isOwner
                            ? "🔒 Subscribers only"
                            : "🔒 Premium pick"}
                        </span>
                        {isSubOnly && !isSubscriber && !isOwner ? (
                          <button
                            type="button"
                            onClick={handleSubscribe}
                            disabled={
                              subBusy || subInfo?.is_open_for_new_subs === false
                            }
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              border: "none",
                              background: "#3b82f6",
                              color: "#fff",
                              cursor: subBusy ? "default" : "pointer",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {subBusy
                              ? "Starting…"
                              : subInfo?.is_open_for_new_subs === false
                              ? "Full"
                              : "Subscribe →"}
                          </button>
                        ) : (
                          <Link
                            to="/premium"
                            style={{
                              fontSize: 11,
                              color: "#FBBF24",
                              textDecoration: "underline",
                              whiteSpace: "nowrap",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Unlock →
                          </Link>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{p.market}</span>
                        {p.is_premium_only && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "rgba(248, 250, 252, 0.04)",
                              border: "1px solid rgba(251, 191, 36, 0.7)",
                              color: "#FBBF24",
                            }}
                          >
                            🔒 Premium
                          </span>
                        )}
                        {p.is_subscriber_only && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "rgba(37, 99, 235, 0.18)",
                              border: "1px solid rgba(59, 130, 246, 0.9)",
                              color: "#93c5fd",
                            }}
                          >
                            👥 Subscribers
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Bookmaker */}
                  <td>{locked ? "—" : p.bookmaker || "—"}</td>

                  {/* Odds */}
                  <td>{locked ? "—" : number(p.price)}</td>

                  {/* Stake */}
                  <td>{locked ? "—" : number(p.stake)}</td>

                  {/* Result */}
                  <td>
                    {locked ? (
                      <span className="badge neutral">🔒</span>
                    ) : (
                      <ResultBadge result={p.result} />
                    )}
                  </td>

                  {/* EV */}
                  <td
                    style={{
                      textAlign: "right",
                      color:
                        (p.model_edge ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                    }}
                  >
                    {locked
                      ? "—"
                      : p.model_edge == null
                      ? "—"
                      : number(p.model_edge * 100, 1) + "%"}
                  </td>

                  {/* Profit */}
                  <td
                    style={{
                      textAlign: "right",
                      color: (p.profit ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                    }}
                  >
                    {locked ? "—" : number(p.profit)}
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

      {/* ACCAS TABLE */}
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
                              style={{
                                textDecoration: "none",
                                color: "inherit",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                }}
                              >
                                <span style={{ opacity: 0.7 }}>{i + 1}.</span>
                                <span style={{ fontWeight: 600 }}>
                                  {leg.home_name}
                                </span>
                                <span style={{ opacity: 0.7 }}>vs</span>
                                <span style={{ fontWeight: 600 }}>
                                  {leg.away_name}
                                </span>
                                <span
                                  style={{
                                    marginLeft: 8,
                                    opacity: 0.75,
                                  }}
                                >
                                  {leg.market}
                                </span>
                                <span
                                  style={{
                                    marginLeft: "auto",
                                    opacity: 0.85,
                                  }}
                                >
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
        .page {
          padding: 16px;
          color: #eaf4ed;
          max-width: 1100px;
          margin: 0 auto;
        }

        .profile {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 20px;
        }
        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
        }
        .metricsRow {
          display: flex;
          gap: 12px;
          font-size: 0.9rem;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .focusPill {
          padding: 2px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          font-size: 0.78rem;
          background: rgba(0, 0, 0, 0.35);
        }

        .socialRow {
          display: flex;
          gap: 12px;
          margin-top: 6px;
          font-size: 0.9rem;
        }
        .socialRow a {
          color: #9be7ff;
          text-decoration: none;
        }
        .socialRow a:hover {
          text-decoration: underline;
        }

        .subCard {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          background: radial-gradient(circle at top left, #1e3a3a, #020b08);
          border: 1px solid rgba(148, 255, 215, 0.4);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 0.85rem;
        }
        .subLabel {
          font-size: 0.8rem;
          opacity: 0.85;
          margin-bottom: 2px;
        }
        .subPrice {
          font-size: 1rem;
          font-weight: 600;
        }
        .subPriceUnit {
          font-size: 0.8rem;
          opacity: 0.85;
          margin-left: 4px;
        }
        .subStatus {
          font-size: 0.78rem;
          opacity: 0.8;
          margin-top: 2px;
        }

        .statsPanel {
          background: #0a0f0c;
          border-radius: 14px;
          padding: 14px 16px 16px;
          margin-bottom: 22px;
          border: 1px solid rgba(255, 255, 255, 0.09);
        }
        .statsHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .statsTitle {
          font-weight: 700;
          font-size: 0.95rem;
          letter-spacing: 0.02em;
        }
        .statsSubtitle {
          font-size: 0.8rem;
          opacity: 0.8;
        }
        .rangeTabs {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .rangeBtn {
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          background: transparent;
          color: #eaf4ed;
          font-size: 0.75rem;
          cursor: pointer;
        }
        .rangeBtnActive {
          background: #145a32;
          border-color: #1db954;
        }

        .statsGrid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
          gap: 16px;
          margin-top: 12px;
        }
        @media (max-width: 800px) {
          .statsGrid {
            grid-template-columns: 1fr;
          }
        }

        .cardsRow {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
          gap: 8px;
        }
        .statCard {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
          padding: 8px 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .statCard .label {
          font-size: 0.72rem;
          opacity: 0.85;
          margin-bottom: 2px;
        }
        .statCard .value {
          font-size: 0.95rem;
          font-weight: 600;
        }
        .statCard .value.good {
          color: #80ffb0;
        }
        .statCard .value.bad {
          color: #ff9a9a;
        }

        .streakRow {
          margin-top: 10px;
          font-size: 0.86rem;
          display: flex;
          justify-content: space-between;
          gap: 8px;
          opacity: 0.9;
        }

        .statsRight {
          background: rgba(3, 20, 10, 0.9);
          border-radius: 12px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }
        .chartLabel {
          font-size: 0.78rem;
          opacity: 0.85;
          margin-bottom: 4px;
        }

        .splitTables {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 14px;
          margin-top: 14px;
        }
        @media (max-width: 900px) {
          .splitTables {
            grid-template-columns: 1fr;
          }
        }
        .tableBlock {
          background: rgba(3, 16, 10, 0.9);
          border-radius: 10px;
          padding: 8px 10px 10px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .tableTitle {
          font-size: 0.8rem;
          opacity: 0.9;
          margin-bottom: 4px;
        }
        .tableEmpty {
          font-size: 0.8rem;
          opacity: 0.75;
        }

        .miniTable {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          margin-top: 4px;
        }

        .miniTable thead th {
          padding: 4px 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          text-align: left;
          font-weight: 500;
          opacity: 0.85;
          background: rgba(0, 0, 0, 0.25);
          color: #eaf4ed;
        }

        .miniTable tbody td {
          padding: 4px 4px;
        }

        .miniTable tbody tr:nth-child(odd) {
          background: rgba(255, 255, 255, 0.02);
        }

        .roiBadge {
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 0.72rem;
        }
        .roiGood {
          background: #124b27;
          color: #b6f2c6;
        }
        .roiBad {
          background: #4b1212;
          color: #f2b6b6;
        }

        .tableWrap {
          background: #0a0f0c;
          border-radius: 12px;
          overflow-x: auto;
        }
        table.picks {
          width: 100%;
          border-collapse: collapse;
        }
        .picks thead th {
          text-align: left;
          padding: 8px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          color: #eaf4ed;
          background: rgba(255, 255, 255, 0.06);
          white-space: nowrap;
        }
        .picks td {
          padding: 10px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 14px;
          color: #eaf4ed;
        }

        .btnSmall {
          padding: 6px 10px;
          border-radius: 8px;
          background: #2e7d32;
          color: #fff;
          border: 0;
          cursor: pointer;
        }
        .btnGhost {
          background: transparent;
          border: 1px solid #2e7d32;
          color: #2e7d32;
        }
        .btnDanger {
          background: #a52727;
        }
        .btnSmall[disabled] {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btnFollow {
          background: #1c2933;
          border: 1px solid #9be7ff;
          color: #9be7ff;
        }
        .btnFollow:hover:enabled {
          background: #163040;
        }

        .actionsCell {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .settleRow {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .btnTag {
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 0.8rem;
          border: 0;
          cursor: pointer;
        }
        .btnTag.win {
          background: #124b27;
          color: #b6f2c6;
        }
        .btnTag.lose {
          background: #4b1212;
          color: #f2b6b6;
        }
        .btnTag.push {
          background: #1f2a44;
          color: #c8d7ff;
        }
        .btnTag.void {
          background: #3b3b3b;
          color: #e7e7e7;
        }
        .btnTag:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .badge {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
        }
        .badge.win {
          background: #124b27;
          color: #b6f2c6;
        }
        .badge.lose {
          background: #4b1212;
          color: #f2b6b6;
        }
        .badge.push {
          background: #1f2a44;
          color: #c8d7ff;
        }
        .badge.void {
          background: #3b3b3b;
          color: #e7e7e7;
        }
        .badge.neutral {
          background: #263238;
          color: #e0e0e0;
        }
      `}</style>
    </div>
  );
}