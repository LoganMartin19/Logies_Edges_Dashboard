// File: src/pages/ClubPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import styles from "../styles/ClubPage.module.css";
import { api } from "../api";

function fmtDate(d) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return "";
  }
}

function formPillsFromRecent(recentForm = []) {
  // show last 5 results as pills: W/D/L (fallback to summary if needed)
  return (recentForm || []).slice(0, 5).map((m, idx) => ({
    key: m.fixture_id ?? idx,
    res: m.result || "?",
  }));
}

const ClubPage = () => {
  const { teamId, slug } = useParams(); // route: /club/:teamId/:slug
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const team_id = Number(teamId);
  const season = Number(sp.get("season") || 2025);
  const league_id = sp.get("league") ? Number(sp.get("league")) : null;

  const [overview, setOverview] = useState(null);
  const [fixtures, setFixtures] = useState(null);
  const [err, setErr] = useState(null);

  const team = overview?.team || {};
  const venue = team?.venue || {};

  const displayName = useMemo(() => {
    return team?.name || (slug ? String(slug).replace(/_/g, " ") : null) || `Team ${team_id}`;
  }, [team?.name, slug, team_id]);

  useEffect(() => {
    const load = async () => {
      try {
        setErr(null);
        setOverview(null);
        setFixtures(null);

        const [ov, fx] = await Promise.all([
          api.get("/football/club/overview", {
            params: { team_id, season, league_id: league_id ?? undefined },
          }),
          api.get("/football/club/fixtures", {
            params: { team_id, season, last: 10, next: 0, league_only: false },
          }),
        ]);

        setOverview(ov.data);
        setFixtures(fx.data);
      } catch (e) {
        console.error(e);
        setErr("Could not load club.");
      }
    };

    if (team_id) load();
  }, [team_id, season, league_id]);

  if (err) return <p className={styles.error}>{err}</p>;
  if (!overview || !fixtures) return <p className={styles.loading}>Loading…</p>;

  const played = Array.isArray(fixtures.played) ? fixtures.played : [];

  const s = overview.form_summary || {};
  const stats = {
    played: (s.wins ?? 0) + (s.draws ?? 0) + (s.losses ?? 0),
    wins: s.wins ?? 0,
    draws: s.draws ?? 0,
    losses: s.losses ?? 0,
    gf: s.gf ?? 0,
    ga: s.ga ?? 0,
    avg_gf: Number(s.avg_gf ?? 0),
    avg_ga: Number(s.avg_ga ?? 0),
  };

  const pills = formPillsFromRecent(overview?.recent_form);

  const venueName = team?.venue_name || venue?.name || null;
  const venueCity = venue?.city || null;
  const venueCapacity = venue?.capacity || null;

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topRow}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className={styles.rightMeta}>
          <span className={styles.seasonChip}>Season: {season}</span>
          {league_id ? <span className={styles.leagueChip}>League: {league_id}</span> : null}
        </div>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.logoWrap}>
            {team?.logo ? (
              <img src={team.logo} alt={displayName} className={styles.logo} />
            ) : (
              <div className={styles.logoFallback}>{(displayName || "T").slice(0, 1).toUpperCase()}</div>
            )}
          </div>

          <div className={styles.heroText}>
            <h1 className={styles.title}>{displayName}</h1>

            <div className={styles.subline}>
              {venueName ? (
                <span className={styles.subItem}>
                  🏟️ {venueName}
                  {venueCity ? <span className={styles.dim}> • {venueCity}</span> : null}
                  {venueCapacity ? <span className={styles.dim}> • {venueCapacity.toLocaleString()} cap</span> : null}
                </span>
              ) : (
                <span className={styles.subItemDim}>🏟️ Stadium not available yet</span>
              )}
            </div>

            <div className={styles.pillsRow}>
              <span className={styles.pillsLabel}>Form</span>
              <div className={styles.pills}>
                {pills.length ? (
                  pills.map((p) => (
                    <span
                      key={p.key}
                      className={
                        p.res === "W"
                          ? styles.pillW
                          : p.res === "D"
                          ? styles.pillD
                          : p.res === "L"
                          ? styles.pillL
                          : styles.pillX
                      }
                    >
                      {p.res}
                    </span>
                  ))
                ) : (
                  <span className={styles.subItemDim}>No recent form</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Played</div>
            <div className={styles.statVal}>{stats.played}</div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>W-D-L</div>
            <div className={styles.statVal}>
              {stats.wins}-{stats.draws}-{stats.losses}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>GF / GA</div>
            <div className={styles.statVal}>
              {stats.gf} / {stats.ga}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLabel}>Avg GF / Avg GA</div>
            <div className={styles.statVal}>
              {stats.avg_gf.toFixed(2)} / {stats.avg_ga.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={styles.bodyGrid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Club Overview</h2>
            <span className={styles.cardHint}>Auto-built from recent matches</span>
          </div>

          <div className={styles.kv}>
            <div className={styles.kvRow}>
              <span className={styles.kvKey}>Form (last {s.lookback ?? 5})</span>
              <span className={styles.kvVal}>
                {stats.wins}W – {stats.draws}D – {stats.losses}L
              </span>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.kvKey}>Goals For / Against</span>
              <span className={styles.kvVal}>
                {stats.gf} / {stats.ga}
              </span>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.kvKey}>Goals per game</span>
              <span className={styles.kvVal}>
                {stats.avg_gf.toFixed(2)} scored • {stats.avg_ga.toFixed(2)} conceded
              </span>
            </div>

            <div className={styles.kvRow}>
              <span className={styles.kvKey}>Team ID</span>
              <span className={styles.kvVal}>{team_id}</span>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Recent</h2>
            <span className={styles.cardHint}>Click a match to open the fixture page</span>
          </div>

          {played.length === 0 ? (
            <p className={styles.muted}>No recent fixtures found.</p>
          ) : (
            <ul className={styles.fxList}>
              {played.map((fx) => {
                const home = fx.home;
                const away = fx.away;
                const hg = fx.home_goals ?? "-";
                const ag = fx.away_goals ?? "-";

                // W/D/L chip from this team’s perspective (best-effort)
                let res = null;
                if (typeof fx.home_goals === "number" && typeof fx.away_goals === "number") {
                  const isHome = String(home).toLowerCase() === String(displayName).toLowerCase();
                  const gf = isHome ? fx.home_goals : fx.away_goals;
                  const ga = isHome ? fx.away_goals : fx.home_goals;
                  res = gf > ga ? "W" : gf < ga ? "L" : "D";
                }

                return (
                  <li key={fx.fixture_id} className={styles.fxItem}>
                    <Link to={`/fixtures/${fx.fixture_id}`} className={styles.fxLink}>
                      <span
                        className={
                          res === "W"
                            ? styles.resW
                            : res === "D"
                            ? styles.resD
                            : res === "L"
                            ? styles.resL
                            : styles.resX
                        }
                      >
                        {res || "•"}
                      </span>

                      <div className={styles.fxMain}>
                        <div className={styles.fxTeams}>
                          <span className={styles.fxTeamStrong}>{home}</span>
                          <span className={styles.fxScore}>
                            {hg}–{ag}
                          </span>
                          <span className={styles.fxTeamStrong}>{away}</span>
                        </div>

                        <div className={styles.fxMeta}>
                          {fx.league || "—"} • {fx.date ? fmtDate(fx.date) : ""}
                        </div>
                      </div>

                      <span className={styles.chev}>›</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

export default ClubPage;