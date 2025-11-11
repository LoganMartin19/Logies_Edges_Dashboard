// src/pages/TipstersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTipsters, fetchTipster } from "../api";

const tone = (v = 0) => (v > 0 ? "good" : v < 0 ? "bad" : "muted");

// turn 0.23 -> "23.00", 23 -> "23.00"
const pct = (x, d = 2) => {
  if (x == null || Number.isNaN(Number(x))) return "0.00";
  const n = Number(x);
  const v = n <= 1 && n >= -1 ? n * 100 : n; // tolerate already-in-% or 0–1
  return v.toFixed(d);
};

export default function TipstersPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetch list, then hydrate any missing stats from /tipsters/{username}
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const list = await fetchTipsters(); // lightweight list
        if (cancelled) return;

        // Find anyone with blank/zero stats
        const needsHydrate = list.filter(
          (t) =>
            !t ||
            (t.roi_30d ?? 0) === 0 &&
            (t.winrate_30d ?? 0) === 0 &&
            (t.profit_30d ?? 0) === 0 &&
            (t.picks_30d ?? 0) === 0
        );

        if (needsHydrate.length === 0) {
          setRows(list);
          return;
        }

        // Hydrate in parallel; ignore failures
        const hydratedPairs = await Promise.all(
          needsHydrate.map(async (t) => {
            try {
              const full = await fetchTipster(t.username);
              return [t.username, full];
            } catch {
              return [t.username, null];
            }
          })
        );
        const hydratedMap = Object.fromEntries(hydratedPairs);

        // Merge hydrated stats over the list items
        const merged = list.map((t) => {
          const h = hydratedMap[t.username];
          return h
            ? {
                ...t,
                roi_30d: h.roi_30d ?? t.roi_30d,
                winrate_30d: h.winrate_30d ?? t.winrate_30d,
                profit_30d: h.profit_30d ?? t.profit_30d,
                picks_30d: h.picks_30d ?? t.picks_30d,
              }
            : t;
        });

        if (!cancelled) setRows(merged);
      } catch (e) {
        console.error(e);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // sort by ROI desc (handles 0–1 or %)
  const sorted = useMemo(() => {
    const toNum = (x) => (x == null ? 0 : Number(x));
    return [...rows].sort((a, b) => {
      const ra = toNum(a.roi_30d);
      const rb = toNum(b.roi_30d);
      const aa = Math.abs(ra) <= 1 ? ra * 100 : ra;
      const bb = Math.abs(rb) <= 1 ? rb * 100 : rb;
      return bb - aa;
    });
  }, [rows]);

  if (loading) return <div style={{ padding: 16, color: "#eaf4ed" }}>Loading Tipsters...</div>;

  return (
    <div className="page">
      <h1>Top Tipsters</h1>
      <p className="sub">Independent tipsters ranked by ROI (30d).</p>

      <div className="tipster-grid">
        {sorted.map((c) => {
          const roiPct = Number(pct(c.roi_30d));
          const wrPct  = Number(pct(c.winrate_30d, 1));
          const prof   = Number.isFinite(c.profit_30d) ? c.profit_30d.toFixed(2) : "0.00";
          const picks  = c.picks_30d ?? 0;

          return (
            <Link to={`/tipsters/${c.username}`} key={c.id} className="tipster-card">
              <img
                src={
                  c.avatar_url ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name || c.username || "U")}`
                }
                alt={c.name || c.username}
                className="avatar"
              />
              <div className="info">
                <h3>
                  {c.name || c.username} {c.is_verified && "✅"}
                </h3>
                <p className="handle">@{c.username}</p>
                <p className="bio">{c.bio || "No bio yet"}</p>
                <div className="metrics">
                  <span className={`pill ${tone(roiPct)}`}>ROI: {roiPct.toFixed(2)}%</span>
                  <span className="pill">Winrate: {wrPct.toFixed(1)}%</span>
                  <span className="pill">Profit: {prof}</span>
                  <span className="pill">Picks: {picks}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <style jsx="true">{`
        .page { max-width: 1100px; margin: 0 auto; padding: 16px; color: #eaf4ed; }
        h1 { margin: 0 0 6px 0; }
        .sub { color: rgba(255,255,255,.75); margin-bottom: 20px; }

        .tipster-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); margin-top: 16px; }
        .tipster-card { border: 1px solid rgba(255,255,255,.12); background: #111; color: #eaf4ed; border-radius: 12px; padding: 16px; display: flex; text-decoration: none; transition: transform .15s, box-shadow .15s, border-color .15s; box-shadow: 0 6px 18px rgba(0,0,0,.25); }
        .tipster-card:hover { transform: translateY(-2px); border-color: rgba(255,255,255,.22); box-shadow: 0 10px 26px rgba(0,0,0,.35); }

        .avatar { width: 64px; height: 64px; border-radius: 50%; margin-right: 12px; background: #0b1e13; border: 1px solid rgba(255,255,255,.15); }
        .info h3 { margin: 0 0 2px 0; font-weight: 700; }
        .handle { margin: 0; color: rgba(255,255,255,.7); font-size: .9rem; }
        .bio { margin: 6px 0 8px 0; color: rgba(255,255,255,.85); }

        .metrics { display: flex; flex-wrap: wrap; gap: 8px; font-size: .82rem; margin-top: 6px; }
        .pill { padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); }
        .pill.good { border-color: rgba(15,88,40,.6); background: rgba(15,88,40,.18); color: #b5ffd0; }
        .pill.bad { border-color: rgba(198,40,40,.6); background: rgba(198,40,40,.16); color: #ffc6c6; }
        .pill.muted { color: #eaf4ed; }
      `}</style>
    </div>
  );
}