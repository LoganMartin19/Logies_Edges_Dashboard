// src/pages/TipstersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTipsters, fetchTipster } from "../api";
import PremiumUpsellBanner from "../components/PremiumUpsellBanner";

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
  const [sortBy, setSortBy] = useState("roi");   // roi | profit | winrate | followers | picks
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  // fetch list, then hydrate any missing stats from /tipsters/{username}
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const list = await fetchTipsters(); // lightweight list
        if (cancelled) return;

        // Find anyone with blank/zero stats
        const needsHydrate = list.filter((t) => {
          if (!t) return true;
          const roi = t.roi_30d ?? 0;
          const wr = t.winrate_30d ?? 0;
          const pr = t.profit_30d ?? 0;
          const pk = t.picks_30d ?? 0;
          return roi === 0 && wr === 0 && pr === 0 && pk === 0;
        });

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

  const getNormRoi = (t) => {
    const v = Number(t?.roi_30d ?? 0);
    if (!Number.isFinite(v)) return 0;
    return Math.abs(v) <= 1 ? v * 100 : v; // always treat as %
  };

  const getNormWr = (t) => {
    const v = Number(t?.winrate_30d ?? 0);
    if (!Number.isFinite(v)) return 0;
    return Math.abs(v) <= 1 ? v * 100 : v;
  };

  const getProfit = (t) =>
    Number.isFinite(Number(t?.profit_30d)) ? Number(t.profit_30d) : 0;

  const getFollowers = (t) =>
    Number.isFinite(Number(t?.follower_count)) ? Number(t.follower_count) : 0;

  const getPicks = (t) =>
    Number.isFinite(Number(t?.picks_30d)) ? Number(t.picks_30d) : 0;

  const sorted = useMemo(() => {
    const arr = [...rows];

    const getter = (t) => {
      switch (sortBy) {
        case "profit":
          return getProfit(t);
        case "winrate":
          return getNormWr(t);
        case "followers":
          return getFollowers(t);
        case "picks":
          return getPicks(t);
        case "roi":
        default:
          return getNormRoi(t);
      }
    };

    arr.sort((a, b) => {
      const av = getter(a) ?? 0;
      const bv = getter(b) ?? 0;
      if (sortDir === "asc") return av - bv;
      return bv - av;
    });

    return arr;
  }, [rows, sortBy, sortDir]);

  const handleSort = (col) => {
    setSortBy((prevCol) => {
      if (prevCol === col) {
        // toggle direction
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prevCol;
      }
      // new column: default to desc
      setSortDir("desc");
      return col;
    });
  };

  const sortLabel = (col) => {
    if (sortBy !== col) return "";
    return sortDir === "asc" ? "▲" : "▼";
  };

  if (loading) {
    return (
      <div style={{ padding: 16, color: "#eaf4ed" }}>Loading Tipsters...</div>
    );
  }

  return (
    <div className="tipsters-page">
      <div className="header">
        <div>
          <h1>Tipster Leaderboard</h1>
          <p className="sub">
            Independent tipsters ranked by <strong>last 30 days</strong>.
          </p>
        </div>
        <div className="small-note">
          <span className="legend-dot top3" /> Top 3 highlighted •{" "}
          <span className="legend-dot positive" /> Positive ROI
        </div>
      </div>

      {/* ⭐ Premium upsell – gold button linking to /premium for non-premium users */}
      <PremiumUpsellBanner
        mode="link"
        message="Unlock premium-only tipsters, extended records, and model-led picks with CSB Premium."
      />

      {sorted.length === 0 ? (
        <p style={{ color: "#eaf4ed" }}>No tipsters yet.</p>
      ) : (
        <div className="tableWrap">
          <table className="tbl">
            <thead>
              <tr>
                <th className="rank">#</th>
                <th>Tipster</th>
                <th
                  className="sortable"
                  onClick={() => handleSort("roi")}
                >
                  ROI (30d) {sortLabel("roi")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("profit")}
                >
                  Profit (u) {sortLabel("profit")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("winrate")}
                >
                  Winrate {sortLabel("winrate")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("picks")}
                >
                  Picks {sortLabel("picks")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort("followers")}
                >
                  Followers {sortLabel("followers")}
                </th>
                <th>Focus</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, idx) => {
                const rank = idx + 1;

                const roiPct = Number(pct(c.roi_30d));
                const wrPct = Number(pct(c.winrate_30d, 1));
                const prof = Number.isFinite(c.profit_30d)
                  ? c.profit_30d.toFixed(2)
                  : "0.00";
                const picks = c.picks_30d ?? 0;
                const followers = c.follower_count ?? 0;

                const rowTone = tone(roiPct);

                const rowClassNames = [
                  "row",
                  rowTone,
                  rank <= 3 ? "top3-row" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <tr key={c.id} className={rowClassNames}>
                    <td className="rank-cell">{rank}</td>
                    <td>
                      <Link
                        to={`/tipsters/${c.username}`}
                        className="tipster-link"
                      >
                        <div className="tipster-cell">
                          <img
                            src={
                              c.avatar_url ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                c.name || c.username || "U"
                              )}`
                            }
                            alt={c.name || c.username}
                            className="avatar"
                          />
                          <div>
                            <div className="name">
                              {c.name || c.username}{" "}
                              {c.is_verified && "✅"}
                            </div>
                            <div className="handle">@{c.username}</div>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className={`metric roi ${rowTone}`}>
                      {roiPct.toFixed(2)}%
                    </td>
                    <td className={`metric profit ${rowTone}`}>
                      {prof}
                    </td>
                    <td className="metric">
                      {wrPct.toFixed(1)}%
                    </td>
                    <td className="metric">{picks}</td>
                    <td className="metric">{followers}</td>
                    <td>
                      {c.sport_focus ? (
                        <span className="focus-pill">
                          {c.sport_focus}
                        </span>
                      ) : (
                        <span className="focus-pill muted">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx="true">{`
        .tipsters-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px;
          color: #eaf4ed;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0 0 6px 0;
        }

        .sub {
          color: rgba(255, 255, 255, 0.75);
          margin: 0;
        }

        .small-note {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .legend-dot {
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .legend-dot.top3 {
          background: #ffeb3b;
        }
        .legend-dot.positive {
          background: #2e7d32;
        }

        .tableWrap {
          background: #0a0f0c;
          border-radius: 12px;
          overflow-x: auto;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .tbl {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }

        thead th {
          position: sticky;
          top: 0;
          backdrop-filter: blur(6px);
          background: rgba(7, 16, 11, 0.96);
          text-align: left;
          padding: 8px 10px;
          font-size: 0.85rem;
          color: #eaf4ed;
          border-bottom: 1px solid rgba(255, 255, 255, 0.16);
          white-space: nowrap;
        }

        th.rank {
          width: 36px;
          text-align: center;
        }

        th.sortable {
          cursor: pointer;
          user-select: none;
        }

        th.sortable:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        tbody tr.row {
          transition: background 0.12s, transform 0.12s;
        }

        tbody tr.row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        tbody tr.top3-row:nth-child(1) {
          box-shadow: inset 3px 0 0 #ffeb3b;
        }
        tbody tr.top3-row:nth-child(2) {
          box-shadow: inset 3px 0 0 #b0bec5;
        }
        tbody tr.top3-row:nth-child(3) {
          box-shadow: inset 3px 0 0 #ffb74d;
        }

        td {
          padding: 10px 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.9rem;
          color: #eaf4ed;
        }

        .rank-cell {
          text-align: center;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .tipster-link {
          text-decoration: none;
          color: inherit;
        }

        .tipster-cell {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #0b1e13;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .name {
          font-weight: 600;
          margin-bottom: 2px;
        }

        .handle {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .metric {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .metric.roi.good,
        .metric.profit.good {
          color: #b5ffd0;
        }
        .metric.roi.bad,
        .metric.profit.bad {
          color: #ffc6c6;
        }

        .focus-pill {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.04);
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .focus-pill.muted {
          opacity: 0.6;
        }

        @media (max-width: 720px) {
          .tipsters-page {
            padding: 12px;
          }
          .tbl {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}