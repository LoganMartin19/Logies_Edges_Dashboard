// src/components/PlayersSection.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/FixturePage.module.css";
import { api } from "../api"; // ✅ env-based axios client

const fmtPct = (p) => (p == null ? "—" : `${(Number(p) * 100).toFixed(0)}%`);
const fmtOdds = (o) =>
  o == null ? "—" : Number(o) >= 100 ? Number(o).toFixed(0) : Number(o).toFixed(2);
const fmtEdgeVal = (edge, p, price) =>
  edge != null
    ? `${(Number(edge) * 100).toFixed(1)}%`
    : p && price
    ? `${(((Number(p) * Number(price)) - 1) * 100).toFixed(1)}%`
    : "—";

export default function PlayersSection({ fixtureId, homeTeam, awayTeam }) {
  const [matchData, setMatchData] = useState({ home: [], away: [] });
  const [seasonData, setSeasonData] = useState({ home: [], away: [] });
  const [lineupIds, setLineupIds] = useState({ home: null, away: null });
  const [propsMap, setPropsMap] = useState({});

  useEffect(() => {
    let mounted = true;

    async function fetchAll() {
      try {
        // 1) Match-specific players
        const matchRes = await api.get("/football/players", {
          params: { fixture_id: fixtureId },
        });
        const matchJson = matchRes.data;

        // 2) Season totals
        const seasonRes = await api.get("/football/season-players", {
          params: { fixture_id: fixtureId },
        });
        const seasonJson = seasonRes.data;
        const seasonPlayers = seasonJson?.players || { home: [], away: [] };

        // 3) Lineups
        const lineRes = await api.get("/football/lineups", {
          params: { fixture_id: fixtureId },
        });
        const lineJson = lineRes.data;

        if (!mounted) return;
        setMatchData({
          home: matchJson?.players?.home || [],
          away: matchJson?.players?.away || [],
        });
        setSeasonData({
          home: seasonPlayers.home || [],
          away: seasonPlayers.away || [],
        });

        const toIdSet = (teamBlock) => {
          if (!teamBlock) return null;
          const ids = new Set();
          (teamBlock.startXI || []).forEach((x) => x?.player?.id && ids.add(x.player.id));
          (teamBlock.substitutes || []).forEach((x) => x?.player?.id && ids.add(x.player.id));
          return ids;
        };

        let homeLine = null,
          awayLine = null;
        const arr = Array.isArray(lineJson?.response) ? lineJson.response : [];
        for (const t of arr) {
          const tname = t?.team?.name?.toLowerCase?.() || "";
          if (tname === (homeTeam || "").toLowerCase()) homeLine = t;
          if (tname === (awayTeam || "").toLowerCase()) awayLine = t;
        }
        setLineupIds({ home: toIdSet(homeLine), away: toIdSet(awayLine) });

        // 4) Player props
        const [homePropsRes, awayPropsRes] = await Promise.all([
          api.get("/football/player-props/fair", { params: { fixture_id: fixtureId, team: "home" } }),
          api.get("/football/player-props/fair", { params: { fixture_id: fixtureId, team: "away" } }),
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

  // ✅ Wrapped in useCallback so useMemo deps are valid
  const mergeStats = useCallback(
    (matchList, seasonList, idSet) => {
      const seasonMap = new Map(seasonList.map((p) => [p?.player?.id, p]));
      const filtered = idSet ? matchList.filter((p) => idSet.has(p?.player?.id)) : matchList;

      return filtered.map((mp) => {
        const sid = mp?.player?.id;
        const season = seasonMap.get(sid);
        return {
          ...mp,
          seasonTotal: season?.total || null,
          competitions: season?.competitions || [],
          props: propsMap[sid] || {},
        };
      });
    },
    [propsMap]
  );

  const homePlayers = useMemo(
    () => mergeStats(matchData.home, seasonData.home, lineupIds.home),
    [matchData, seasonData, lineupIds, mergeStats]
  );

  const awayPlayers = useMemo(
    () => mergeStats(matchData.away, seasonData.away, lineupIds.away),
    [matchData, seasonData, lineupIds, mergeStats]
  );

  const renderPropsRow = (p) => {
    const pr = p.props || {};
    const shots = pr["shots_over_1.5"];
    const sot = pr["sot_over_0.5"];
    const fouls = pr["fouls_over_0.5"];
    const card = pr["to_be_booked"];

    const cell = (label, r) => (
      <span>
        {label}: {fmtPct(r?.prob)} (fair {fmtOdds(r?.fair_odds)}){" "}
        {r?.best_price ? `@${fmtOdds(r.best_price)}` : ""}{" "}
        {r ? `| ${fmtEdgeVal(r.edge, r.prob, r.best_price)}` : ""}
      </span>
    );

    return (
      <div className={styles.playerPropsLine}>
        {cell("Shots 1.5", shots)}
        {cell("SoT 0.5", sot)}
        {cell("Fouls 0.5", fouls)}
        {cell("Card", card)}
      </div>
    );
  };

  const renderTeam = (label, list) => {
    if (!list.length) return null;

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
        <h3>{label}</h3>
        <ul className={styles.playerList}>
          {scored.map((p, i) => {
            const s = p.statistics?.[0] || {};
            const games = s.games || {};
            const shots = s.shots || {};
            const goals = s.goals || {};
            const passes = s.passes || {};
            const cards = s.cards || {};
            const pos = games.position || "?";

            return (
              <li key={p.player?.id ?? i} className={styles.playerRow}>
                <img
                  src={p.player?.photo}
                  alt={p.player?.name}
                  className={styles.playerPhotoTiny}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <div className={styles.playerMeta}>
                  <div className={styles.playerNameLine}>
                    <strong>
                      <Link to={`/player/${p.player?.id}?fixture_id=${fixtureId}`}>{p.player?.name}</Link>
                    </strong>
                    <span className={styles.playerPos}> ({pos})</span>
                  </div>
                  <div className={styles.playerStatsLine}>
                    ⚽ {goals.total ?? 0} | 🅰 {goals.assists ?? 0} | 🎯 {shots.total ?? 0} (On: {shots.on ?? 0}) | 📊{" "}
                    {passes.accuracy ?? 0}% | 🟨 {cards.yellow ?? 0}/🟥 {cards.red ?? 0}
                  </div>
                  {p.seasonTotal && (
                    <div className={styles.playerSubline}>
                      Season: {p.seasonTotal?.games?.appearences ?? 0} apps, {p.seasonTotal?.goals?.total ?? 0} goals,{" "}
                      {p.seasonTotal?.goals?.assists ?? 0} assists
                    </div>
                  )}
                  {renderPropsRow(p)}
                  {p.competitions?.length > 0 && (
                    <details>
                      <summary>Show breakdown</summary>
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
                              <td>{c?.games?.appearences ?? 0}</td>
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

  if (!homePlayers.length && !awayPlayers.length) return <p>No player stats available.</p>;

  return (
    <div className={styles.tabContent}>
      <h3>Player Stats</h3>
      {renderTeam(homeTeam, homePlayers)}
      {renderTeam(awayTeam, awayPlayers)}
    </div>
  );
}