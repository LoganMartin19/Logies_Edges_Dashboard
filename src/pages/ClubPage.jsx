// File: src/pages/ClubPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import styles from "../styles/ClubPage.module.css";
import { api } from "../api";

function safeNum(x, d = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : d;
}

function fmtInt(x) {
  const n = safeNum(x, null);
  return n === null ? "—" : n.toLocaleString();
}

function fmtFloat(x, dp = 2) {
  const n = safeNum(x, null);
  return n === null ? "—" : n.toFixed(dp);
}

function pickLeagueSummary(statsPayload) {
  // /football/club/stats returns: { stats: <_get_team_stats_cached result> }
  // cached result shape is whatever your service returns; commonly { response: {...} } or direct payload.
  const raw = statsPayload?.stats || statsPayload || null;
  const r = raw?.response || raw?.stats?.response || raw?.data?.response || raw?.response || raw;

  if (!r || typeof r !== "object") return null;

  const fixtures = r.fixtures || {};
  const goals = r.goals || {};

  const played = safeNum(fixtures?.played?.total, 0);
  const wins = safeNum(fixtures?.wins?.total, 0);
  const draws = safeNum(fixtures?.draws?.total, 0);
  const losses = safeNum(fixtures?.loses?.total, 0);

  const gf = safeNum(goals?.for?.total?.total, 0);
  const ga = safeNum(goals?.against?.total?.total, 0);

  const avgGf = safeNum(goals?.for?.average?.total, 0);
  const avgGa = safeNum(goals?.against?.average?.total, 0);

  const form = typeof r.form === "string" ? r.form : null;

  return { played, wins, draws, losses, gf, ga, avgGf, avgGa, form };
}

const LOOKBACK_OPTIONS = [5, 10, 15];

export default function ClubPage() {
  const { teamId, slug } = useParams(); // route: /clubs/:teamId/:slug
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();

  const team_id = Number(teamId);

  // Query params (shareable links)
  const season = safeNum(sp.get("season"), 2025);
  const league_id = sp.get("league") ? safeNum(sp.get("league"), null) : null;
  const lookback = safeNum(sp.get("lookback"), 5);
  const scope = (sp.get("scope") || "all").toLowerCase(); // "all" | "league"

  const effectiveLookback = LOOKBACK_OPTIONS.includes(lookback) ? lookback : 5;
  const leagueOnly = scope === "league" && Number.isFinite(league_id);

  const [overview, setOverview] = useState(null);
  const [fixtures, setFixtures] = useState(null);
  const [leagueStats, setLeagueStats] = useState(null);
  const [err, setErr] = useState(null);

  const displayName = useMemo(() => {
    return overview?.team?.name || slug || `Team ${team_id}`;
  }, [overview, slug, team_id]);

  const venue = overview?.team?.venue || {};
  const logo = overview?.team?.logo || null;

  const recentForm = Array.isArray(overview?.recent_form) ? overview.recent_form : [];

  const formSummary = overview?.form_summary || {};
  const recentStats = {
    played: safeNum(formSummary.wins, 0) + safeNum(formSummary.draws, 0) + safeNum(formSummary.losses, 0),
    wins: safeNum(formSummary.wins, 0),
    draws: safeNum(formSummary.draws, 0),
    losses: safeNum(formSummary.losses, 0),
    gf: safeNum(formSummary.gf, 0),
    ga: safeNum(formSummary.ga, 0),
    avg_gf: safeNum(formSummary.avg_gf, 0),
    avg_ga: safeNum(formSummary.avg_ga, 0),
  };

  const seasonLeagueSummary = useMemo(() => {
    if (!leagueStats) return null;
    return pickLeagueSummary(leagueStats);
  }, [leagueStats]);

  // ---------- LOAD ----------
  useEffect(() => {
    const load = async () => {
      try {
        setErr(null);
        setOverview(null);
        setFixtures(null);
        setLeagueStats(null);

        const calls = [
          api.get("/football/club/overview", {
            params: {
              team_id,
              season,
              // if you pass league_id here it also returns league_stats inside overview, but we’ll use dedicated /club/stats for “full season”
              league_id: league_id ?? undefined,
              lookback: effectiveLookback,
            },
          }),
          api.get("/football/club/fixtures", {
            params: {
              team_id,
              season,
              last: 12,
              next: 0,
              league_only: leagueOnly,
              league_id: leagueOnly ? league_id : undefined,
            },
          }),
        ];

        // Full season league-only stats panel (only when league_id is known)
        if (league_id) {
          calls.push(
            api.get("/football/club/stats", {
              params: { team_id, league_id, season },
            })
          );
        }

        const res = await Promise.all(calls);

        const ov = res[0]?.data;
        const fx = res[1]?.data;
        const st = league_id ? res[2]?.data : null;

        setOverview(ov);
        setFixtures(fx);
        setLeagueStats(st);
      } catch (e) {
        console.error(e);
        setErr("Could not load club.");
      }
    };

    if (team_id) load();
  }, [team_id, season, league_id, effectiveLookback, leagueOnly]);

  // ---------- UI actions ----------
  function setQuery(next) {
    const cur = Object.fromEntries([...sp.entries()]);
    const merged = { ...cur, ...next };

    // clean empties
    Object.keys(merged).forEach((k) => {
      if (merged[k] === undefined || merged[k] === null || merged[k] === "") delete merged[k];
    });

    setSp(merged, { replace: true });
  }

  function onToggleScope() {
    if (!league_id) return; // can’t go league-only without league_id
    setQuery({ scope: leagueOnly ? "all" : "league" });
  }

  if (err) return <p className={styles.error}>{err}</p>;
  if (!overview || !fixtures) return <p className={styles.loading}>Loading…</p>;

  const played = Array.isArray(fixtures.played) ? fixtures.played : [];

  return (
    <div className={styles.page}>
      {/* Top row */}
      <div className={styles.topRow}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className={styles.controls}>
          <div className={styles.controlPill} title="Season">
            <span className={styles.controlLabel}>Season</span>
            <span className={styles.controlValue}>{season}</span>
          </div>

          <div className={styles.controlPill} title="Form lookback (all comps)">
            <span className={styles.controlLabel}>Form</span>
            <select
              className={styles.select}
              value={effectiveLookback}
              onChange={(e) => setQuery({ lookback: e.target.value })}
            >
              {LOOKBACK_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Last {n}
                </option>
              ))}
            </select>
          </div>

          <button
            className={`${styles.toggleBtn} ${leagueOnly ? styles.toggleOn : ""}`}
            onClick={onToggleScope}
            disabled={!league_id}
            title={league_id ? "Toggle league-only fixtures" : "Pass ?league=XX to enable league-only"}
          >
            {leagueOnly ? "League-only: ON" : "League-only: OFF"}
          </button>
        </div>
      </div>

      {/* Hero header */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.badge}>
            {logo ? (
              <img src={logo} alt={displayName} className={styles.logo} />
            ) : (
              <div className={styles.logoFallback}>{displayName?.[0]?.toUpperCase() || "T"}</div>
            )}
          </div>

          <div className={styles.heroMeta}>
            <h1 className={styles.title}>{displayName}</h1>

            <div className={styles.subRow}>
              <span className={styles.subText}>
                {venue?.name ? venue.name : "Stadium not available yet"}
              </span>
              {venue?.city ? <span className={styles.dot}>•</span> : null}
              {venue?.city ? <span className={styles.subText}>{venue.city}</span> : null}
              {venue?.capacity ? <span className={styles.dot}>•</span> : null}
              {venue?.capacity ? <span className={styles.subText}>{fmtInt(venue.capacity)} cap</span> : null}
            </div>

            {/* Form pills like FixturePage */}
            <div className={styles.formRow}>
              <span className={styles.formLabel}>Form</span>
              <div className={styles.formPills}>
                {recentForm.slice(0, effectiveLookback).map((m) => (
                  <span
                    key={`${m.fixture_id}-${m.date}`}
                    className={`${styles.pill} ${
                      m.result === "W" ? styles.pillW : m.result === "D" ? styles.pillD : styles.pillL
                    }`}
                    title={`${m.result} vs ${m.opponent || "Opponent"} (${m.score_for}-${m.score_against})`}
                  >
                    {m.result}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top cards */}
        <div className={styles.heroRight}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Played</div>
            <div className={styles.statVal}>{recentStats.played}</div>
            <div className={styles.statHint}>Last {effectiveLookback}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>W-D-L</div>
            <div className={styles.statVal}>
              {recentStats.wins}-{recentStats.draws}-{recentStats.losses}
            </div>
            <div className={styles.statHint}>Last {effectiveLookback}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>GF / GA</div>
            <div className={styles.statVal}>
              {recentStats.gf} / {recentStats.ga}
            </div>
            <div className={styles.statHint}>Last {effectiveLookback}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Avg GF / Avg GA</div>
            <div className={styles.statVal}>
              {fmtFloat(recentStats.avg_gf, 2)} / {fmtFloat(recentStats.avg_ga, 2)}
            </div>
            <div className={styles.statHint}>Last {effectiveLookback}</div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className={styles.grid}>
        {/* Overview / season stats */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Club Overview</h2>
            <span className={styles.cardSub}>Auto-built from recent matches</span>
          </div>

          <div className={styles.kv}>
            <div className={styles.kvRow}>
              <span className={styles.k}>Form (last {effectiveLookback})</span>
              <span className={styles.v}>
                {recentStats.wins}W – {recentStats.draws}D – {recentStats.losses}L
              </span>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.k}>Goals For / Against</span>
              <span className={styles.v}>
                {recentStats.gf} / {recentStats.ga}
              </span>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.k}>Goals per game</span>
              <span className={styles.v}>
                {fmtFloat(recentStats.avg_gf, 2)} scored • {fmtFloat(recentStats.avg_ga, 2)} conceded
              </span>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.k}>Team ID</span>
              <span className={styles.v}>{team_id}</span>
            </div>
          </div>

          {/* Full season (league-only) stats */}
          <div className={styles.divider} />

          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitleSmall}>Season Stats</h3>
            <span className={styles.cardSub}>
              {league_id ? `League-only (league_id=${league_id})` : "Pass ?league=XX to enable league stats"}
            </span>
          </div>

          {!league_id || !seasonLeagueSummary ? (
            <p className={styles.muted}>
              {league_id
                ? "League stats not available yet for this team/league/season."
                : "Tip: open from a Fixture link that includes ?league=XX so we can show full season league stats."}
            </p>
          ) : (
            <div className={styles.seasonGrid}>
              <div className={styles.seasonStat}>
                <div className={styles.seasonLabel}>Played</div>
                <div className={styles.seasonVal}>{seasonLeagueSummary.played}</div>
              </div>
              <div className={styles.seasonStat}>
                <div className={styles.seasonLabel}>W-D-L</div>
                <div className={styles.seasonVal}>
                  {seasonLeagueSummary.wins}-{seasonLeagueSummary.draws}-{seasonLeagueSummary.losses}
                </div>
              </div>
              <div className={styles.seasonStat}>
                <div className={styles.seasonLabel}>GF / GA</div>
                <div className={styles.seasonVal}>
                  {seasonLeagueSummary.gf} / {seasonLeagueSummary.ga}
                </div>
              </div>
              <div className={styles.seasonStat}>
                <div className={styles.seasonLabel}>Avg GF / Avg GA</div>
                <div className={styles.seasonVal}>
                  {fmtFloat(seasonLeagueSummary.avgGf, 2)} / {fmtFloat(seasonLeagueSummary.avgGa, 2)}
                </div>
              </div>
              {seasonLeagueSummary.form ? (
                <div className={styles.seasonStatWide}>
                  <div className={styles.seasonLabel}>Provider Form String</div>
                  <div className={styles.seasonValMono}>{seasonLeagueSummary.form}</div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        {/* Recent fixtures */}
        <section className={styles.card}>
          <div className={styles.cardHeaderRow}>
            <h2 className={styles.cardTitle}>Recent</h2>
            <span className={styles.cardSub}>Click a match to open the fixture page</span>
          </div>

          {played.length === 0 ? (
            <p className={styles.muted}>No recent fixtures found.</p>
          ) : (
            <ul className={styles.list}>
              {played.map((fx) => (
                <li key={fx.fixture_id} className={styles.listItem}>
                  <Link to={`/fixtures/${fx.fixture_id}`} className={styles.fxLink}>
                    <div className={styles.fxRow}>
                      <div className={styles.fxLeft}>
                        <span className={styles.fxTeams}>
                          {fx.home}{" "}
                          <span className={styles.score}>
                            {fx.home_goals ?? "—"}–{fx.away_goals ?? "—"}
                          </span>{" "}
                          {fx.away}
                        </span>
                        <span className={styles.fxMeta}>
                          {fx.league || "—"} •{" "}
                          {fx.date ? new Date(fx.date).toLocaleString() : ""}
                        </span>
                      </div>
                      <span className={styles.chev}>›</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}