// src/components/TeamContextPanel.jsx
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../api";
import styles from "../styles/TeamContextPanel.module.css";

function fmtNum(x, d = 2) {
  if (x == null || Number.isNaN(x)) return "—";
  return Number(x).toFixed(d);
}

function fmtForm(form) {
  if (!form || typeof form !== "string") return "—";
  // API-Football style: "WWDLW"
  return form.split("").join(" ");
}

function fmtRecord(s) {
  if (!s) return "—";
  const w = s.wins ?? 0;
  const d = s.draws ?? 0;
  const l = s.losses ?? 0;
  return `${w}W – ${d}D – ${l}L`;
}

export default function TeamContextPanel({ fixtureId, homeTeam, awayTeam }) {
  const [teamStats, setTeamStats] = useState(null);
  const [pace, setPace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!fixtureId) return;

    let alive = true;
    setLoading(true);
    setErr("");

    Promise.all([
      api.get("/football/team-stats", { params: { fixture_id: fixtureId } }),
      api.get("/football/opponent-pace", { params: { fixture_id: fixtureId } }),
    ])
      .then(([tsRes, paceRes]) => {
        if (!alive) return;
        setTeamStats(tsRes.data || null);
        setPace(paceRes.data || null);
      })
      .catch((e) => {
        if (!alive) return;
        console.error("Failed to load team context:", e);
        setErr("Failed to load team stats context.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [fixtureId]);

  const homeCtx = useMemo(() => {
    if (!teamStats || !pace) return null;

    const sumHome = teamStats.summary?.home || {};
    const foulsHome = pace.home_context?.fouls_avgs || {};
    const attHome = pace.home_context?.attack_avgs || {};

    // 🔥 Prefer “all competitions” fields if backend provides them
    const gf =
      sumHome.gf_all ??
      sumHome.gf ??
      0;
    const ga =
      sumHome.ga_all ??
      sumHome.ga ??
      0;
    const avg_gf =
      sumHome.avg_gf_all ??
      sumHome.avg_gf ??
      0;
    const avg_ga =
      sumHome.avg_ga_all ??
      sumHome.avg_ga ??
      0;

    return {
      name: homeTeam || teamStats.home_team || "Home",
      played: sumHome.played_total ?? 0,
      record: fmtRecord(sumHome),
      gf,
      ga,
      avg_gf,
      avg_ga,
      form: sumHome.form,
      attack: {
        shots: attHome.shots_for,
        sot: attHome.sot_for,
        corners: attHome.corners,
        cards: attHome.cards,
        xg: attHome.xg,
      },
      fouls: {
        committed: foulsHome.fouls_committed_per_match,
        drawn: foulsHome.fouls_drawn_per_match,
      },
      defensive: {
        shotsA: pace.home_context?.opp_shots_against_per_match,
        sotA: pace.home_context?.opp_sot_against_per_match,
        paceShots: pace.home_context?.pace_factor_shots,
        paceSoT: pace.home_context?.pace_factor_sot,
      },
    };
  }, [teamStats, pace, homeTeam]);

  const awayCtx = useMemo(() => {
    if (!teamStats || !pace) return null;

    const sumAway = teamStats.summary?.away || {};
    const foulsAway = pace.away_context?.fouls_avgs || {};
    const attAway = pace.away_context?.attack_avgs || {};

    const gf =
      sumAway.gf_all ??
      sumAway.gf ??
      0;
    const ga =
      sumAway.ga_all ??
      sumAway.ga ??
      0;
    const avg_gf =
      sumAway.avg_gf_all ??
      sumAway.avg_gf ??
      0;
    const avg_ga =
      sumAway.avg_ga_all ??
      sumAway.avg_ga ??
      0;

    return {
      name: awayTeam || teamStats.away_team || "Away",
      played: sumAway.played_total ?? 0,
      record: fmtRecord(sumAway),
      gf,
      ga,
      avg_gf,
      avg_ga,
      form: sumAway.form,
      attack: {
        shots: attAway.shots_for,
        sot: attAway.sot_for,
        corners: attAway.corners,
        cards: attAway.cards,
        xg: attAway.xg,
      },
      fouls: {
        committed: foulsAway.fouls_committed_per_match,
        drawn: foulsAway.fouls_drawn_per_match,
      },
      defensive: {
        shotsA: pace.away_context?.opp_shots_against_per_match,
        sotA: pace.away_context?.opp_sot_against_per_match,
        paceShots: pace.away_context?.pace_factor_shots,
        paceSoT: pace.away_context?.pace_factor_sot,
      },
    };
  }, [teamStats, pace, awayTeam]);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <div className={styles.title}>Team context & pace</div>
          </div>
          <p className={styles.loading}>Loading team stats…</p>
        </div>
      </div>
    );
  }

  if (err || !homeCtx || !awayCtx) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.headerRow}>
            <div className={styles.title}>Team context & pace</div>
          </div>
          <p className={styles.error}>{err || "No team stats available."}</p>
        </div>
      </div>
    );
  }

  const renderSide = (ctx) => (
    <div className={styles.side}>
      <div className={styles.sideHeader}>
        <div className={styles.sideName}>{ctx.name}</div>
        <div className={styles.form}>
          Form: <span>{fmtForm(ctx.form)}</span>
        </div>
      </div>

      <div className={styles.rowBlock}>
        <div className={styles.blockTitle}>Season profile</div>
        <div className={styles.blockBody}>
          <div className={styles.kv}>
            <span>Record</span>
            <span>{ctx.record}</span>
          </div>
          <div className={styles.kv}>
            <span>GF / GA</span>
            <span>
              {ctx.gf} / {ctx.ga}
            </span>
          </div>
          <div className={styles.kv}>
            <span>Avg GF / GA</span>
            <span>
              {fmtNum(ctx.avg_gf, 2)} / {fmtNum(ctx.avg_ga, 2)}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.rowBlock}>
        <div className={styles.blockTitle}>Recent attack (last 5)</div>
        <div className={styles.blockBody}>
          <div className={styles.kv}>
            <span>Shots / SoT</span>
            <span>
              {fmtNum(ctx.attack.shots)} / {fmtNum(ctx.attack.sot)}
            </span>
          </div>
          <div className={styles.kv}>
            <span>Corners</span>
            <span>{fmtNum(ctx.attack.corners)}</span>
          </div>
          <div className={styles.kv}>
            <span>Cards</span>
            <span>{fmtNum(ctx.attack.cards)}</span>
          </div>
          <div className={styles.kv}>
            <span>xG</span>
            <span>{fmtNum(ctx.attack.xg)}</span>
          </div>
        </div>
      </div>

      <div className={styles.rowBlock}>
        <div className={styles.blockTitle}>Fouls (per match)</div>
        <div className={styles.blockBody}>
          <div className={styles.kv}>
            <span>Committed</span>
            <span>{fmtNum(ctx.fouls.committed)}</span>
          </div>
          <div className={styles.kv}>
            <span>Drawn</span>
            <span>{fmtNum(ctx.fouls.drawn)}</span>
          </div>
        </div>
      </div>

      <div className={styles.rowBlock}>
        <div className={styles.blockTitle}>Opponent defensive profile</div>
        <div className={styles.blockBody}>
          <div className={styles.kv}>
            <span>Shots conceded</span>
            <span>{fmtNum(ctx.defensive.shotsA)}</span>
          </div>
          <div className={styles.kv}>
            <span>SoT conceded</span>
            <span>{fmtNum(ctx.defensive.sotA)}</span>
          </div>
          <div className={styles.kv}>
            <span>Pace (shots)</span>
            <span>×{fmtNum(ctx.defensive.paceShots, 3)}</span>
          </div>
          <div className={styles.kv}>
            <span>Pace (SoT)</span>
            <span>×{fmtNum(ctx.defensive.paceSoT, 3)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.title}>Team context & pace</div>
          <div className={styles.subtitle}>
            Season profile + last 5 attacking output, fouls and opponent defensive pace.
          </div>
        </div>
        <div className={styles.sidesRow}>
          {renderSide(homeCtx)}
          <div className={styles.divider} />
          {renderSide(awayCtx)}
        </div>
      </div>
    </div>
  );
}