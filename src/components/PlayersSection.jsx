// src/components/PlayersSection.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import styles from "../styles/FixturePage.module.css";
import { api } from "../api";

const fmtPct = (p) =>
  p == null ? "—" : `${(Number(p) * 100).toFixed(0)}%`;
const fmtOdds = (o) =>
  o == null
    ? "—"
    : Number(o) >= 100
    ? Number(o).toFixed(0)
    : Number(o).toFixed(2);
const fmtEdgeVal = (edge, p, price) =>
  edge != null
    ? `${(Number(edge) * 100).toFixed(1)}%`
    : p && price
    ? `${(((Number(p) * Number(price)) - 1) * 100).toFixed(1)}%`
    : "—";

export default function PlayersSection({ fixtureId, homeTeam, awayTeam }) {
  // ✅ season-level data only
  const [seasonData, setSeasonData] = useState({ home: [], away: [] });
  const [lineupIds, setLineupIds] = useState({ home: null, away: null });
  const [propsMap, setPropsMap] = useState({});
  const [activeTeam, setActiveTeam] = useState("home");

  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      try {
        // 1) Season totals (cached)
        const seasonRes = await api.get("/football/season-players", {
          params: { fixture_id: fixtureId },
        });
        const seasonJson = seasonRes.data;
        const seasonPlayers = seasonJson?.players || { home: [], away: [] };

        // 2) Lineups – only used to filter down the season list
        const lineRes = await api.get("/football/lineups", {
          params: { fixture_id: fixtureId },
        });
        const lineJson = lineRes.data;

        if (!mounted) return;

        setSeasonData({
          home: seasonPlayers.home || [],
          away: seasonPlayers.away || [],
        });

        const toIdSet = (teamBlock) => {
          if (!teamBlock) return null;
          const ids = new Set();
          (teamBlock.startXI || []).forEach(
            (x) => x?.player?.id && ids.add(x.player.id)
          );
          (teamBlock.substitutes || []).forEach(
            (x) => x?.player?.id && ids.add(x.player.id)
          );
          return ids;
        };

        let homeLine = null,
          awayLine = null;
        const arr = Array.isArray(lineJson?.response)
          ? lineJson.response
          : [];
        for (const t of arr) {
          const tname = t?.team?.name?.toLowerCase?.() || "";
          if (tname === (homeTeam || "").toLowerCase()) homeLine = t;
          if (tname === (awayTeam || "").toLowerCase()) awayLine = t;
        }
        setLineupIds({ home: toIdSet(homeLine), away: toIdSet(awayLine) });

        // 3) Player props (shots / SoT / fouls / cards)
        const [homePropsRes, awayPropsRes] = await Promise.all([
          api.get("/football/player-props/fair", {
            params: { fixture_id: fixtureId, team: "home" },
          }),
          api.get("/football/player-props/fair", {
            params: { fixture_id: fixtureId, team: "away" },
          }),
        ]);
        const homeProps = homePropsRes.data;
        const awayProps = awayPropsRes.data;

        const buildMap = (propsObj) => {
          const map = {};
          (propsObj?.props || []).forEach((r) => {
            const pid = Number(r.player_id);
            if (!map[pid]) map[pid] = {};
            map[pid][r.market] = r;
          });
          return map;
        };

        if (!mounted) return;
        setPropsMap({ ...buildMap(homeProps), ...buildMap(awayProps) });
      } catch (err) {
        console.error("PlayersSection fetch error:", err);
      }
    }

    fetchAll();
    return () => {
      mounted = false;
    };
  }, [fixtureId, homeTeam, awayTeam]);

  // ✅ Season-only merge (optionally filtered to lineup)
  const mergeSeason = useCallback(
    (seasonList, idSet) => {
      const filtered = idSet
        ? seasonList.filter((p) => idSet.has(p?.player?.id))
        : seasonList;

      return filtered.map((sp) => {
        const pid = sp?.player?.id;
        return {
          ...sp,
          // these come from your cached season endpoint
          seasonTotal: sp.total || null,
          competitions: sp.competitions || [],
          props: propsMap[pid] || {},
        };
      });
    },
    [propsMap]
  );

  const homePlayers = useMemo(
    () => mergeSeason(seasonData.home, lineupIds.home),
    [seasonData, lineupIds, mergeSeason]
  );

  const awayPlayers = useMemo(
    () => mergeSeason(seasonData.away, lineupIds.away),
    [seasonData, lineupIds, mergeSeason]
  );

  const renderPropsRow = (p) => {
    const pr = p.props || {};
    const shots = pr["shots_over_1.5"];
    const sot = pr["sot_over_0.5"];
    const fouls = pr["fouls_over_0.5"];
    const card = pr["to_be_booked"];

    const cell = (label, r) =>
      r ? (
        <span>
          {label}: {fmtPct(r?.prob)} (fair {fmtOdds(r?.fair_odds)}){" "}
          {r?.best_price ? `@${fmtOdds(r.best_price)}` : ""}{" "}
          {r ? `· ${fmtEdgeVal(r.edge, r.prob, r.best_price)}` : ""}
        </span>
      ) : null;

    return (
      <div className={styles.playerPropsLine}>
        {cell("Sh 1.5", shots)}
        {cell("SoT 0.5", sot)}
        {cell("Fouls 0.5", fouls)}
        {cell("Card", card)}
      </div>
    );
  };

  const renderTeam = (label, list) => {
    if (!list.length) {
      return (
        <p style={{ fontSize: 13, opacity: 0.7 }}>
          No season stats found for {label}.
        </p>
      );
    }

    const getMaxEdge = (pl) =>
      Math.max(
        pl?.props?.["sot_over_0.5"]?.edge ?? -1,
        pl?.props?.["shots_over_1.5"]?.edge ?? -1,
        pl?.props?.["fouls_over_0.5"]?.edge ?? -1,
        pl?.props?.["to_be_booked"]?.edge ?? -1
      );

    const scored = [...list].sort((a, b) => {
      const ea = getMaxEdge(a);
      const eb = getMaxEdge(b);
      if (eb !== ea) return eb - ea;
      const sa = a?.props?.["sot_over_0.5"]?.prob ?? 0;
      const sb = b?.props?.["sot_over_0.5"]?.prob ?? 0;
      return sb - sa;
    });

    return (
      <div className={styles.lineupBlock}>
        <ul className={styles.playerList}>
          {scored.map((p, i) => {
            // first statistics block = main competition
            const s = p.statistics?.[0] || {};
            const games = s.games || {};
            const shots = s.shots || {};
            const goals = s.goals || {};
            const passes = s.passes || {};
            const cards = s.cards || {};
            const pos = games.position || "?";

            return (
              <li
                key={p.player?.id ?? i}
                className={styles.playerRow}
                style={{
                  display: "grid",
                  gridTemplateColumns: "40px 1fr",
                  gap: 8,
                  padding: "8px 6px",
                  borderBottom:
                    "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <img
                  src={p.player?.photo}
                  alt={p.player?.name}
                  className={styles.playerPhotoTiny}
                  style={{ width: 38, height: 38, borderRadius: "50%" }}
                  onError={(e) =>
                    (e.currentTarget.style.display = "none")
                  }
                />
                <div className={styles.playerMeta}>
                  <div className={styles.playerNameLine}>
                    <strong>
                      <Link
                        to={`/player/${p.player?.id}?fixture_id=${fixtureId}`}
                      >
                        {p.player?.name}
                      </Link>
                    </strong>
                    <span className={styles.playerPos}>
                      {" "}
                      ({pos})
                    </span>
                  </div>

                  {/* season snapshot from main comp */}
                  <div
                    className={styles.playerStatsLine}
                    style={{ fontSize: 12 }}
                  >
                    ⚽ {goals.total ?? 0} | 🅰{" "}
                    {goals.assists ?? 0} | 🎯 {shots.total ?? 0} (
                    {shots.on ?? 0} on) | 🟨 {cards.yellow ?? 0}/🟥{" "}
                    {cards.red ?? 0}
                  </div>

                  {/* full season totals across comps */}
                  {p.seasonTotal && (
                    <div
                      className={styles.playerSubline}
                      style={{ fontSize: 11, opacity: 0.8 }}
                    >
                      Season:{" "}
                      {p.seasonTotal?.games?.appearences ?? 0} apps,{" "}
                      {p.seasonTotal?.goals?.total ?? 0} goals,{" "}
                      {p.seasonTotal?.goals?.assists ?? 0} assists
                    </div>
                  )}

                  {renderPropsRow(p)}

                  {p.competitions?.length > 0 && (
                    <details style={{ marginTop: 4 }}>
                      <summary style={{ fontSize: 11 }}>
                        Show competition breakdown
                      </summary>
                      <table className={styles.oddsTable}>
                        <thead>
                          <tr>
                            <th>Competition</th>
                            <th>Apps</th>
                            <th>Goals</th>
                            <th>Assists</th>
                            <th>Minutes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.competitions.map((c, j) => (
                            <tr key={j}>
                              <td>{c.league}</td>
                              <td>
                                {c?.games?.appearences ?? 0}
                              </td>
                              <td>{c?.goals?.total ?? 0}</td>
                              <td>{c?.assists ?? 0}</td>
                              <td>{c?.games?.minutes ?? 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  if (!homePlayers.length && !awayPlayers.length)
    return <p>No player stats available.</p>;

  const activePlayers =
    activeTeam === "home" ? homePlayers : awayPlayers;
  const activeLabel = activeTeam === "home" ? homeTeam : awayTeam;

  return (
    <div className={styles.tabContent}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Player Stats</h3>
        <div
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            borderRadius: 999,
            padding: 2,
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(148,163,184,0.5)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTeam("home")}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: "none",
              fontSize: 12,
              cursor: "pointer",
              background:
                activeTeam === "home"
                  ? "rgba(34,197,94,0.9)"
                  : "transparent",
              color:
                activeTeam === "home" ? "#fff" : "rgba(226,232,240,0.9)",
            }}
          >
            {homeTeam}
          </button>
          <button
            type="button"
            onClick={() => setActiveTeam("away")}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: "none",
              fontSize: 12,
              cursor: "pointer",
              background:
                activeTeam === "away"
                  ? "rgba(34,197,94,0.9)"
                  : "transparent",
              color:
                activeTeam === "away" ? "#fff" : "rgba(226,232,240,0.9)",
            }}
          >
            {awayTeam}
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>
        Showing props and <strong>full season stats</strong> for{" "}
        <strong>{activeLabel}</strong>. Tap a player for their full
        dashboard.
      </p>

      {renderTeam(activeLabel, activePlayers)}
    </div>
  );
}