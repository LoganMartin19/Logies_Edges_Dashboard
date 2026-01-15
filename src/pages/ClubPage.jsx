// File: src/pages/ClubPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import styles from "../styles/ClubPage.module.css";
import { api } from "../api";

function fmtDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function resultBadgeClass(res) {
  const r = (res || "").toUpperCase();
  if (r === "W") return "badgeW";
  if (r === "D") return "badgeD";
  if (r === "L") return "badgeL";
  return "badgeN";
}

function parseRecentResult(teamName, fx) {
  // Works with your /football/club/fixtures payload:
  // { home, away, home_goals, away_goals, date, league, ... }
  // We'll derive W/D/L from the score if available.
  const home = fx?.home;
  const away = fx?.away;
  const hg = fx?.home_goals;
  const ag = fx?.away_goals;

  if (hg == null || ag == null) return null;

  const isHome = home === teamName;
  const gf = isHome ? hg : ag;
  const ga = isHome ? ag : hg;

  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
}

const ClubPage = () => {
  const { teamId, slug } = useParams(); // /club/:teamId/:slug
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const team_id = Number(teamId);

  // allow passing ?season=2025&league=39 from fixture page
  const season = Number(sp.get("season") || 2025);
  const league_id = sp.get("league") ? Number(sp.get("league")) : null;

  const [overview, setOverview] = useState(null);
  const [fixtures, setFixtures] = useState(null);
  const [err, setErr] = useState(null);

  const displayName = useMemo(() => {
    // Prefer API name, then slug, then fallback
    return overview?.team?.name || (slug ? String(slug).replaceAll("_", " ") : null) || `Team ${team_id}`;
  }, [overview, slug, team_id]);

  const venueName = useMemo(() => {
    // Optional future backend field:
    // overview.team.venue_name OR overview.team.venue?.name
    return (
      overview?.team?.venue_name ||
      overview?.team?.venue?.name ||
      overview?.team?.stadium ||
      null
    );
  }, [overview]);

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
            params: { team_id, season, last: 12, next: 0, league_only: false }, // ✅ no upcoming for now
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

  // Build a simple form strip from recent_form if present
  const formStrip = Array.isArray(overview.recent_form) ? overview.recent_form : [];

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className={styles.topbarRight}>
          <span className={styles.chip}>
            Season: <strong>{season}</strong>
          </span>
          {league_id ? (
            <span className={styles.chip}>
              League ID: <strong>{league_id}</strong>
            </span>
          ) : null}
        </div>
      </div>

      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.heroLeft}>
          {overview?.team?.logo ? (
            <img src={overview.team.logo} alt={displayName} className={styles.logo} />
          ) : (
            <div className={styles.logoFallback} aria-hidden="true">
              {displayName?.slice(0, 1)?.toUpperCase()}
            </div>
          )}

          <div className={styles.heroTitleBlock}>
            <h1 className={styles.title}>{displayName}</h1>
            <div className={styles.subtitleRow}>
              {venueName ? <span className={styles.subtitle}>🏟️ {venueName}</span> : null}
              <span className={styles.subtitleMuted}>
                Team ID: {team_id}
              </span>
            </div>

            {formStrip.length ? (
              <div className={styles.formStrip} title="Recent form">
                {formStrip.slice(0, 8).map((m, idx) => {
                  const r = (m?.result || "").toUpperCase();
                  const cls =
                    r === "W" ? styles.pillW : r === "D" ? styles.pillD : r === "L" ? styles.pillL : styles.pillN;
                  return (
                    <span key={idx} className={`${styles.formPill} ${cls}`}>
                      {r || "—"}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Stat tiles */}
        <div className={styles.tiles}>
          <div className={styles.tile}>
            <div className={styles.tileLabel}>Played</div>
            <div className={styles.tileVal}>{stats.played}</div>
          </div>

          <div className={styles.tile}>
            <div className={styles.tileLabel}>W-D-L</div>
            <div className={styles.tileVal}>
              {stats.wins}-{stats.draws}-{stats.losses}
            </div>
          </div>

          <div className={styles.tile}>
            <div className={styles.tileLabel}>GF / GA</div>
            <div className={styles.tileVal}>
              {stats.gf} / {stats.ga}
            </div>
          </div>

          <div className={styles.tile}>
            <div className={styles.tileLabel}>Avg GF / Avg GA</div>
            <div className={styles.tileVal}>
              {stats.avg_gf.toFixed(2)} / {stats.avg_ga.toFixed(2)}
            </div>
          </div>
        </div>
      </header>

      {/* Main layout */}
      <div className={styles.grid}>
        {/* Left: quick facts / placeholders */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Club Overview</h2>
            <span className={styles.cardHint}>Auto-built from recent matches</span>
          </div>

          <div className={styles.kvGrid}>
            <div className={styles.kv}>
              <div className={styles.k}>Form (last {s.lookback ?? 5})</div>
              <div className={styles.v}>
                {stats.wins}W • {stats.draws}D • {stats.losses}L
              </div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Goals For / Against</div>
              <div className={styles.v}>
                {stats.gf} / {stats.ga}
              </div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Goals per game</div>
              <div className={styles.v}>
                {stats.avg_gf.toFixed(2)} scored • {stats.avg_ga.toFixed(2)} conceded
              </div>
            </div>

            <div className={styles.kv}>
              <div className={styles.k}>Stadium</div>
              <div className={styles.v}>
                {venueName ? venueName : <span className={styles.muted}>Not available yet</span>}
              </div>
            </div>
          </div>

          <div className={styles.note}>
            Next step: we can enrich venue/stadium from provider once we add it to <code>/football/club/overview</code>.
          </div>
        </section>

        {/* Right: recent list */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Recent</h2>
            <span className={styles.cardHint}>Click a match to open the fixture page</span>
          </div>

          {played.length === 0 ? (
            <p className={styles.muted}>No recent fixtures found.</p>
          ) : (
            <ul className={styles.matchList}>
              {played.map((fx) => {
                const derivedRes = parseRecentResult(displayName, fx) || null;
                const badge = derivedRes || "—";
                const badgeCls = styles[resultBadgeClass(badge)] || styles.badgeN;

                return (
                  <li key={fx.fixture_id} className={styles.matchRow}>
                    <Link to={`/fixtures/${fx.fixture_id}`} className={styles.matchLink}>
                      <span className={`${styles.badge} ${badgeCls}`}>{badge}</span>

                      <div className={styles.matchMain}>
                        <div className={styles.matchTeams}>
                          <span className={styles.team}>{fx.home}</span>
                          <span className={styles.score}>
                            {fx.home_goals ?? "—"}–{fx.away_goals ?? "—"}
                          </span>
                          <span className={styles.team}>{fx.away}</span>
                        </div>

                        <div className={styles.matchMeta}>
                          <span>{fx.league || "—"}</span>
                          <span className={styles.dot}>•</span>
                          <span>{fmtDate(fx.date)}</span>
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