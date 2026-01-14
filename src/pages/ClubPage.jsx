// File: src/pages/ClubPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import styles from "../styles/ClubPage.module.css";
import { api } from "../api";

const ClubPage = () => {
  // supports both /club/:teamId and /club/:teamId/:slug (slug optional)
  const { teamId, slug } = useParams();
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const team_id = Number(teamId);
  const validTeamId = Number.isFinite(team_id) && team_id > 0;

  // allow passing ?season=2025&league=39 from fixture page
  const season = Number(sp.get("season") || 2025);
  const league_id = sp.get("league") ? Number(sp.get("league")) : null;

  const [overview, setOverview] = useState(null);
  const [fixtures, setFixtures] = useState(null);
  const [err, setErr] = useState(null);

  const displayName = useMemo(() => {
    return overview?.team?.name || slug || (validTeamId ? `Team ${team_id}` : "Club");
  }, [overview, slug, team_id, validTeamId]);

  const fmtDate = (iso) =>
    iso
      ? new Date(iso).toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

  useEffect(() => {
    const load = async () => {
      try {
        setErr(null);
        setOverview(null);
        setFixtures(null);

        const [ov, fx] = await Promise.all([
          api.get("/football/club/overview", {
            params: {
              team_id,
              season,
              league_id: league_id ?? undefined,
            },
          }),
          // NOTE: upcoming is not implemented in backend yet (returns [])
          api.get("/football/club/fixtures", {
            params: { team_id, season, last: 10, next: 5, league_only: false },
          }),
        ]);

        setOverview(ov.data);
        setFixtures(fx.data);
      } catch (e) {
        console.error(e);
        setErr("Could not load club.");
      }
    };

    if (!validTeamId) {
      setErr("Invalid team id.");
      return;
    }

    load();
  }, [validTeamId, team_id, season, league_id]);

  if (err) return <p className={styles.error}>{err}</p>;
  if (!overview || !fixtures) return <p className={styles.loading}>Loading…</p>;

  const played = Array.isArray(fixtures.played) ? fixtures.played : [];
  const upcoming = Array.isArray(fixtures.upcoming) ? fixtures.upcoming : [];

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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className={styles.titleRow}>
          {overview?.team?.logo ? (
            <img
              src={overview.team.logo}
              alt={displayName}
              className={styles.logo}
            />
          ) : null}
          <h1 className={styles.title}>{displayName}</h1>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Played</div>
            <div className={styles.statVal}>{stats.played ?? "-"}</div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>W-D-L</div>
            <div className={styles.statVal}>
              {stats.wins}-{stats.draws}-{stats.losses}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>GF / GA</div>
            <div className={styles.statVal}>
              {stats.gf} / {stats.ga}
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Avg GF / Avg GA</div>
            <div className={styles.statVal}>
              {Number(stats.avg_gf).toFixed(2)} / {Number(stats.avg_ga).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Leaving Upcoming in place (backend currently returns empty []) */}
        <section className={styles.card}>
          <h2>Upcoming</h2>
          {upcoming.length === 0 ? (
            <p className={styles.muted}>No upcoming fixtures found.</p>
          ) : (
            <ul className={styles.list}>
              {upcoming.map((fx) => (
                <li key={fx.fixture_id} className={styles.listItem}>
                  <Link to={`/fixtures/${fx.fixture_id}`} className={styles.fxLink}>
                    <div className={styles.fxMain}>
                      <span className={styles.fxTeams}>
                        {fx.home} vs {fx.away}
                      </span>
                      <span className={styles.fxMeta}>
                        {fx.league || "—"} • {fmtDate(fx.date)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.card}>
          <h2>Recent</h2>
          {played.length === 0 ? (
            <p className={styles.muted}>No recent fixtures found.</p>
          ) : (
            <ul className={styles.list}>
              {played.map((fx) => (
                <li key={fx.fixture_id} className={styles.listItem}>
                  <Link to={`/fixtures/${fx.fixture_id}`} className={styles.fxLink}>
                    <div className={styles.fxMain}>
                      <span className={styles.fxTeams}>
                        {fx.home} {fx.home_goals ?? "-"}–{fx.away_goals ?? "-"}{" "}
                        {fx.away}
                      </span>
                      <span className={styles.fxMeta}>
                        {fx.league || "—"} • {fmtDate(fx.date)}
                      </span>
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
};

export default ClubPage;