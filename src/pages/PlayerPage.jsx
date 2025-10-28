// src/pages/PlayerPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import styles from "../styles/PlayerPage.module.css";
import { api } from "../api";

const safe = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : "—";

/* ---------------- Small Components ---------------- */

function StatBadge({ title, value, sub }) {
  return (
    <div className={styles.badge}>
      <div className={styles.badgeTitle}>{title}</div>
      <div className={styles.badgeValue}>{value}</div>
      {sub ? <div className={styles.badgeSub}>{sub}</div> : null}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoVal}>{value}</span>
    </div>
  );
}

function MiniKeyVal({ k, v }) {
  return (
    <div className={styles.kv}>
      <span>{k}</span>
      <b>{v}</b>
    </div>
  );
}

function Tooltip({ tip }) {
  if (!tip?.show) return null;
  const { x, y, html } = tip;
  return (
    <div
      className={styles.tooltip}
      style={{ left: x + 10, top: y + 10 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ---------------- Charts ---------------- */

function ShotsChart({ games }) {
  const data = (games || []).slice().reverse();
  const shots = data.map((g) => +g.shots || 0);
  const sots = data.map((g) => +g.sot || 0);
  const maxY = Math.max(1, ...shots, ...sots);
  const W = Math.max(560, data.length * 56);
  const H = 210;
  const pad = 30;
  const colW = (W - pad * 2) / Math.max(1, data.length) - 10;
  const avg = shots.length ? shots.reduce((a, b) => a + b, 0) / shots.length : 0;
  const [tip, setTip] = useState({ show: false });
  const x = (i) => pad + i * (colW + 10);
  const y = (v) => H - pad - (v / maxY) * (H - pad * 2);
  const h = (v) => (v / maxY) * (H - pad * 2);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Shots (bars) & SoT (dots)</div>
      <div className="scrollX">
        <svg width={W} height={H} onMouseLeave={() => setTip({ show: false })} className={styles.svg}>
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className={styles.axis} />
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} className={styles.axis} />
          <line x1={pad} x2={W - pad} y1={y(avg)} y2={y(avg)} className={styles.avgLine} />
          {data.map((g, i) => {
            const sh = +g.shots || 0;
            const st = +g.sot || 0;
            const sx = x(i);
            const cx = sx + colW / 2;
            const cy = y(st);
            const by = y(sh);
            const bh = h(sh);
            return (
              <g
                key={i}
                onMouseMove={(e) =>
                  setTip({
                    show: true,
                    x: e.nativeEvent.offsetX,
                    y: e.nativeEvent.offsetY,
                    html: `<strong>${fmtDate(g.date)}</strong><br/>Shots: ${sh}<br/>SoT: ${st}`,
                  })
                }
              >
                <rect x={sx} y={by} width={colW} height={bh} rx="4" className={styles.barPrimary} />
                <circle cx={cx} cy={cy} r="5" className={styles.dotPrimary} />
                <text x={cx} y={H - 8} textAnchor="middle" className={styles.tick}>
                  {(g.date || "").slice(5, 10)}
                </text>
              </g>
            );
          })}
        </svg>
        <Tooltip tip={tip} />
      </div>
    </div>
  );
}

function FoulsChart({ games }) {
  const data = (games || []).slice().reverse();
  const committed = data.map((g) => +g.fouls_committed || 0);
  const drawn = data.map((g) => +g.fouls_drawn || 0);
  const maxY = Math.max(1, ...committed, ...drawn);
  const W = Math.max(560, data.length * 56);
  const H = 210;
  const pad = 30;
  const colW = (W - pad * 2) / Math.max(1, data.length) - 10;
  const avg = committed.length ? committed.reduce((a, b) => a + b, 0) / committed.length : 0;
  const [tip, setTip] = useState({ show: false });
  const x = (i) => pad + i * (colW + 10);
  const y = (v) => H - pad - (v / maxY) * (H - pad * 2);
  const h = (v) => (v / maxY) * (H - pad * 2);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Fouls — committed (bars) & drawn (dots)</div>
      <div className="scrollX">
        <svg width={W} height={H} onMouseLeave={() => setTip({ show: false })} className={styles.svg}>
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} className={styles.axis} />
          <line x1={pad} y1={pad} x2={pad} y2={H - pad} className={styles.axis} />
          <line x1={pad} x2={W - pad} y1={y(avg)} y2={y(avg)} className={styles.avgLineAlt} />
          {data.map((g, i) => {
            const fc = +g.fouls_committed || 0;
            const fd = +g.fouls_drawn || 0;
            const sx = x(i);
            const cx = sx + colW / 2;
            const cy = y(fd);
            const by = y(fc);
            const bh = h(fc);
            return (
              <g
                key={i}
                onMouseMove={(e) =>
                  setTip({
                    show: true,
                    x: e.nativeEvent.offsetX,
                    y: e.nativeEvent.offsetY,
                    html: `<strong>${fmtDate(g.date)}</strong><br/>Committed: ${fc}<br/>Drawn: ${fd}`,
                  })
                }
              >
                <rect x={sx} y={by} width={colW} height={bh} rx="4" className={styles.barWarn} />
                <circle cx={cx} cy={cy} r="5" className={styles.dotWarn} />
                <text x={cx} y={H - 8} textAnchor="middle" className={styles.tick}>
                  {(g.date || "").slice(5, 10)}
                </text>
              </g>
            );
          })}
        </svg>
        <Tooltip tip={tip} />
      </div>
    </div>
  );
}

/* ---------------- Supporting Stats ---------------- */

function SupportingStats({ games }) {
  const cols = [
    { key: "minutes", label: "Minutes" },
    { key: "goals", label: "Goals" },
    { key: "assists", label: "Assists" },
    { key: "yellow", label: "Yellow cards" },
    { key: "red", label: "Red cards" },
    { key: "rating", label: "Rating" },
  ];
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>Supporting Stats</div>
      <div className="scrollX">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Stat</th>
              <th className={styles.num}>Avg (last N)</th>
            </tr>
          </thead>
          <tbody>
            {cols.map((c) => {
              const values = (games || []).map((g) => +g[c.key] || 0);
              const avg =
                values.length > 0 ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2) : "-";
              return (
                <tr key={c.key}>
                  <td>{c.label}</td>
                  <td className={styles.num}>{avg}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- Tabs ---------------- */

function TabGroup({ gameLog }) {
  const [tab, setTab] = useState("shots");
  const tabs = [
    { key: "shots", label: "Shots" },
    { key: "supporting", label: "Supporting" },
    { key: "fouls", label: "Fouls" },
  ];

  return (
    <div className={styles.tabsWrap}>
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`${styles.tabBtn} ${tab === t.key ? styles.tabActive : ""}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "shots" && <ShotsChart games={gameLog} />}
      {tab === "supporting" && <SupportingStats games={gameLog} />}
      {tab === "fouls" && <FoulsChart games={gameLog} />}
    </div>
  );
}

/* ---------------- Main Page ---------------- */

export default function PlayerPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const fixtureId = sp.get("fixture_id");

  const [summary, setSummary] = useState(null);
  const [matchPlayers, setMatchPlayers] = useState(null);
  const [gameLog, setGameLog] = useState([]);
  const [propsRaw, setPropsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastN, setLastN] = useState(8);
  const [compFilter, setCompFilter] = useState("__all__");

  useEffect(() => {
    if (!id || !fixtureId) return;
    let alive = true;

    async function loadAll() {
      try {
        const [sumRes, pmRes, propsRes] = await Promise.all([
          api.get("/football/player/summary", { params: { fixture_id: fixtureId, player_id: id } }),
          api.get("/football/players", { params: { fixture_id: fixtureId } }),
          api.get("/football/player-props/fair", { params: { fixture_id: fixtureId } }),
        ]);
        if (!alive) return;
        setSummary(sumRes.data);
        setMatchPlayers(pmRes.data?.players || { home: [], away: [] });
        setPropsRaw(propsRes.data?.props || []);
      } catch (e) {
        console.error("PlayerPage core fetch failed:", e);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadAll();
    return () => {
      alive = false;
    };
  }, [id, fixtureId]);

  useEffect(() => {
    if (!id || !fixtureId) return;
    let alive = true;
    (async () => {
      try {
        const { data: j } = await api.get("/football/player/game-log", {
          params: { fixture_id: fixtureId, player_id: id, last: lastN },
        });
        if (!alive) return;
        setGameLog(j?.games || []);
      } catch {
        if (alive) setGameLog([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, fixtureId, lastN]);

  if (loading) return <p className={styles.loading}>Loading player…</p>;

  const matchRow =
    matchPlayers?.home?.find((p) => String(p?.player?.id) === id) ||
    matchPlayers?.away?.find((p) => String(p?.player?.id) === id);

  const pmeta = matchRow?.player || summary?.player || {};
  const sBlock = matchRow?.statistics?.[0] || {};
  const teamName = sBlock?.team?.name || summary?.team?.name || "—";

  const seasonTotals = summary?.season_stats?.totals || null;
  const competitions = summary?.season_stats?.competitions || [];

  const goals = sBlock?.goals || {};
  const shots = sBlock?.shots || {};
  const cards = sBlock?.cards || {};

  const matchGoals = `${goals.total || 0} G · ${shots.total || 0} Sh`;
  const matchSot = `${shots.on || 0} on target`;
  const matchCards = `${cards.yellow || 0}Y · ${cards.red || 0}R`;

  const compSet = Array.from(new Set((gameLog || []).map((g) => g.competition || "Unknown")));

  return (
    <div className={`${styles.page} scrollX`}>
      {/* HERO */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          {pmeta.photo && (
            <img src={pmeta.photo} alt={pmeta.name} className={styles.avatar} />
          )}
          <div>
            <div className={styles.nameRow}>
              <h1 className={styles.name}>{pmeta.name || "—"}</h1>
              <span className={styles.club}>• {teamName}</span>
            </div>
            <div className={styles.tags}>
              <MiniKeyVal k="Pos" v={pmeta.position || "—"} />
              <MiniKeyVal k="Fixture" v={<Link to={`/fixture/${fixtureId}`}>Back</Link>} />
            </div>
          </div>
        </div>

        <div className={styles.heroBadges}>
          <StatBadge title="This match" value={matchGoals} sub={matchSot} />
          <StatBadge title="Cards" value={matchCards} />
          {seasonTotals && (
            <StatBadge
              title="Season"
              value={`${safe(seasonTotals.goals)} G · ${safe(seasonTotals.assists)} A`}
              sub={`${safe(seasonTotals.apps)} apps / ${safe(seasonTotals.minutes)} min`}
            />
          )}
        </div>
      </div>

      {/* BODY GRID */}
      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <div className="scrollX">
            <div className={styles.card}>
              <div className={styles.cardHeader}>Competition Breakdown</div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Competition</th>
                    <th className={styles.num}>Apps</th>
                    <th className={styles.num}>Minutes</th>
                    <th className={styles.num}>Goals</th>
                    <th className={styles.num}>Assists</th>
                  </tr>
                </thead>
                <tbody>
                  {(competitions || []).map((c, i) => (
                    <tr key={i}>
                      <td>{c?.league || "—"}</td>
                      <td className={styles.num}>{safe(c?.games?.appearences)}</td>
                      <td className={styles.num}>{safe(c?.games?.minutes)}</td>
                      <td className={styles.num}>{safe(c?.goals?.total)}</td>
                      <td className={styles.num}>{safe(c?.assists)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Season Totals</div>
            <div className={styles.infoGrid}>
              <InfoRow label="Appearances" value={safe(seasonTotals?.apps)} />
              <InfoRow label="Minutes" value={safe(seasonTotals?.minutes)} />
              <InfoRow label="Goals" value={safe(seasonTotals?.goals)} />
              <InfoRow label="Assists" value={safe(seasonTotals?.assists)} />
            </div>
          </div>
        </div>

        <div className={styles.rightCol}>
          <TabGroup gameLog={gameLog} />
        </div>
      </div>
    </div>
  );
}