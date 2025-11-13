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

const SocialLinks = ({ links }) => {
  if (!links) return null;

  const { twitter, instagram, x } = links || {};
  const xHandle = twitter || x;

  const normaliseHandle = (h) =>
    !h
      ? null
      : h.startsWith("http")
      ? h
      : h.startsWith("@")
      ? h.slice(1)
      : h;

  const xUrl = xHandle
    ? xHandle.startsWith("http")
      ? xHandle
      : `https://x.com/${normaliseHandle(xHandle)}`
    : null;

  const igUrl = instagram
    ? instagram.startsWith("http")
      ? instagram
      : `https://instagram.com/${normaliseHandle(instagram)}`
    : null;

  if (!xUrl && !igUrl) return null;

  return (
    <div className="socialLinks">
      {xUrl && (
        <a href={xUrl} target="_blank" rel="noopener noreferrer">
          X
        </a>
      )}
      {igUrl && (
        <a href={igUrl} target="_blank" rel="noopener noreferrer">
          Instagram
        </a>
      )}
    </div>
  );
};

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

          {/* 🔗 Socials */}
          <SocialLinks links={tipster.social_links} />

          <div className="metrics">
            <span>ROI: {percent(roiVal)}%</span>
            <span>Profit: {number(profitVal)}</span>
            <span>Winrate: {percent(wrVal)}%</span>
          </div>
        </div>
      </div>

      <h3>Recent Picks</h3>
      {/* ... rest of your file unchanged ... */}

      <style jsx="true">{`
        .profile { display:flex; gap:16px; align-items:center; margin-bottom:20px; }
        .avatar { width:80px; height:80px; border-radius:50%; }
        .metrics { display:flex; gap:12px; font-size:.9rem; margin-top:8px; }

        .socialLinks {
          display:flex;
          gap:10px;
          margin:6px 0 0;
          font-size:0.9rem;
        }
        .socialLinks a {
          padding:4px 10px;
          border-radius:999px;
          border:1px solid rgba(255,255,255,0.18);
          text-decoration:none;
          color:#eaf4ed;
          opacity:0.9;
        }
        .socialLinks a:hover {
          background:rgba(255,255,255,0.08);
          opacity:1;
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