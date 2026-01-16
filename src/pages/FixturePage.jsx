// File: src/pages/FixturePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

import LeagueFixtures from "../components/LeagueFixtures";
import Poll from "../components/Poll";
import FormBreakdown from "../components/FormBreakdown";
import PredictionsSection from "../components/PredictionsSection";
import LineupsSection from "../components/LineupsSection";
import PlayersSection from "../components/PlayersSection";
import InjuriesSection from "../components/InjuriesSection";
import EventsSection from "../components/EventsSection";
import PlayerPropsSection from "../components/PlayerPropsSection";
import OddsTable from "../components/OddsTable";
import MatchPreview from "../components/MatchPreview";
import styles from "../styles/FixturePage.module.css";
import { slugifyTeamName } from "../utils/slugify";
import { api, fetchFixtureEdges } from "../api";
import { useAuth } from "../components/AuthGate";

// ⭐ preferences hook
import { usePreferences } from "../context/PreferencesContext";

// ⭐ pill component
import FixtureAccessPill from "../components/FixtureAccessPill";

// ⭐ NEW: team context panel
import TeamContextPanel from "../components/TeamContextPanel";

import { placeAndTrackEdge } from "../utils/placeAndTrack";
import { getBookmakerUrl } from "../utils/bookmakers";

// ✅ NEW: odds display helper (decimal + fractional)
import { formatOddsBoth } from "../utils/oddsFormat";

const FixturePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ⭐ favourites from context
  const { favoriteSports, favoriteTeams, favoriteLeagues, updatePreferences } =
    usePreferences();

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/fixtures");
  };

  const fixtureIdNum = Number(id);
  const isAdminView =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/admin");

  const [data, setData] = useState(null);
  const [leagueFixtures, setLeagueFixtures] = useState([]);
  const [formData, setFormData] = useState(null);
  const [formN, setFormN] = useState(5);
  const [formScopeAll, setFormScopeAll] = useState(0);
  const [leagueTable, setLeagueTable] = useState([]);
  const [activeTab, setActiveTab] = useState("preview");
  const [lineupTab, setLineupTab] = useState("lineup");
  const [selectedBookmaker, setSelectedBookmaker] = useState("All");

  const [edges, setEdges] = useState([]);
  const [edgesMeta, setEdgesMeta] = useState(null); // freemium meta
  const [explanations, setExplanations] = useState({});
  const [expandedWhy, setExpandedWhy] = useState(null);

  // “Adding…” loading state on individual edge
  const [placingKey, setPlacingKey] = useState(null);

  const formatKickoff = (utcString) => {
    if (!utcString) return "";
    const s = utcString.endsWith("Z") ? utcString : utcString + "Z";
    return new Date(s).toLocaleString(navigator.language, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const normalizeExplainMarket = (raw) => {
    if (!raw) return "";
    let x = String(raw).toUpperCase().replace(/\s+/g, "");
    const syn = {
      // BTTS
      BTTSYES: "BTTS_Y",
      BTTSY: "BTTS_Y",
      BTTSNO: "BTTS_N",
      BTTSN: "BTTS_N",

      // 1X2
      HOMEWIN: "HOME_WIN",
      AWAYWIN: "AWAY_WIN",

      // DNB (Draw No Bet)
      HOMEDNB: "HOME_DNB",
      HOME_DNB: "HOME_DNB",
      DRAWNOBETHOME: "HOME_DNB",
      HOMEDRAWNOBET: "HOME_DNB",

      AWAYDNB: "AWAY_DNB",
      AWAY_DNB: "AWAY_DNB",
      DRAWNOBETAWAY: "AWAY_DNB",
      AWAYDRAWNOBET: "AWAY_DNB",
    };

    if (syn[x]) return syn[x];

    const ou =
      x.match(/^O?VER?(\d+(\.\d+)?)$/) ||
      x.match(/^U?N?DER?(\d+(\.\d+)?)$/);
    if (ou) {
      if (/^O(VER)?\d/.test(x)) return `O${x.replace(/^O(VER)?/, "")}`;
      if (/^U(NDER)?\d/.test(x)) return `U${x.replace(/^U(NDER)?/, "")}`;
    }

    if (/^O\d+(\.\d+)?$/.test(x) || /^U\d+(\.\d+)?$/.test(x)) return x;

    return x;
  };

  // --- LOAD FIXTURE DATA ----------------------------------------------------
  useEffect(() => {
    const fetchFixture = async () => {
      try {
        const { data: fx } = await api.get(`/api/fixtures/id/${id}/json`);
        setData(fx);

        const { data: roundData } = await api.get(`/api/fixtures/round`, {
          params: { fixture_id: id },
        });
        setLeagueFixtures(roundData);

        const { data: fj } = await api.get(`/form/form/fixture`, {
          params: { fixture_id: id, n: formN, all_comps: formScopeAll },
        });

        setFormData({
          home: fj.home ?? {
            summary: fj.home_form ?? {},
            recent: fj.home_recent ?? [],
          },
          away: fj.away ?? {
            summary: fj.away_form ?? {},
            recent: fj.away_recent ?? [],
          },
          n: fj.n ?? formN,
        });
      } catch (err) {
        console.error("Error fetching fixture:", err);
      }
    };
    fetchFixture();
  }, [id, formN, formScopeAll]);

  // --- LOAD LEAGUE TABLE ----------------------------------------------------
  useEffect(() => {
    if (!data?.fixture?.comp) return;
    const fetchTable = async () => {
      try {
        const { data: tableJson } = await api.get(`/api/fixtures/league/table`, {
          params: { league: data.fixture.comp },
        });
        setLeagueTable(Array.isArray(tableJson) ? tableJson : tableJson.table || []);
      } catch (err) {
        console.error("Error loading league table:", err);
        setLeagueTable([]);
      }
    };
    fetchTable();
  }, [data?.fixture?.comp]);

  // --- LOAD EDGES (new freemium endpoint) -----------------------------------
  useEffect(() => {
    const loadEdges = async () => {
      try {
        const json = await fetchFixtureEdges(fixtureIdNum);
        const fullEdges = json.edges || json.edges_teaser || [];

        setEdges(Array.isArray(fullEdges) ? fullEdges : []);
        setEdgesMeta({
          isPremium: !!json.is_premium,
          hasAccess: !!json.has_access,
          usedToday: json.used_today ?? 0,
          limit: json.limit ?? 0,
          hasFullAccess: !!(json.is_premium || json.has_access),
          isTeaser: !json.is_premium && !json.has_access,
        });
      } catch (err) {
        console.error("Error fetching edges:", err);
        setEdges([]);
        setEdgesMeta(null);
      }
    };
    if (fixtureIdNum) loadEdges();
  }, [fixtureIdNum]);

  // --- WHY EXPLANATION ------------------------------------------------------
  const fetchExplanation = async (rawMarket, index) => {
    if (explanations[rawMarket]) {
      setExpandedWhy(expandedWhy === index ? null : index);
      return;
    }

    const market = normalizeExplainMarket(rawMarket);

    try {
      const { data: json } = await api.get(`/explain/probability`, {
        params: { fixture_id: id, market },
      });
      setExplanations((prev) => ({ ...prev, [rawMarket]: json }));
      setExpandedWhy(index);
    } catch (err) {
      console.error("Error loading explanation:", err);
    }
  };

  // --- PLACE BET BUTTON -----------------------------------------------------
  const handlePlaceEdge = async (edge, key) => {
    if (!user) {
      navigate("/login");
      return;
    }

    const bmUrl = getBookmakerUrl(edge.bookmaker);
    const openUrl = bmUrl
      ? bmUrl
      : "https://google.com/search?q=" + encodeURIComponent(edge.bookmaker);

    window.open(openUrl, "_blank", "noopener");

    try {
      setPlacingKey(key);

      await placeAndTrackEdge({ ...edge, fixture_id: fixtureIdNum }, { stake: 1 });

      navigate("/bets");
    } catch (err) {
      console.error("Failed to place bet:", err);
      alert("Could not place this bet. Try again.");
    } finally {
      setPlacingKey(null);
    }
  };

  // --- FAVOURITES TOGGLES ---------------------------------------------------
  const favTeams = favoriteTeams || [];
  const favLeagues = favoriteLeagues || [];
  const favSports = favoriteSports || [];

  const toggleFavouriteTeam = async (teamName) => {
    if (!user) {
      navigate("/login");
      return;
    }
    const exists = favTeams.includes(teamName);
    const nextTeams = exists ? favTeams.filter((t) => t !== teamName) : [...favTeams, teamName];

    try {
      await updatePreferences({
        favoriteSports: favSports,
        favoriteTeams: nextTeams,
        favoriteLeagues: favLeagues,
      });
    } catch (err) {
      console.error("Failed to update favourite teams from fixture", err);
    }
  };

  const toggleFavouriteLeague = async (leagueCode) => {
    if (!user) {
      navigate("/login");
      return;
    }
    const exists = favLeagues.includes(leagueCode);
    const nextLeagues = exists ? favLeagues.filter((l) => l !== leagueCode) : [...favLeagues, leagueCode];

    try {
      await updatePreferences({
        favoriteSports: favSports,
        favoriteTeams: favTeams,
        favoriteLeagues: nextLeagues,
      });
    } catch (err) {
      console.error("Failed to update favourite leagues from fixture", err);
    }
  };

  // -------------------------------------------------------------------------
  // Early returns (NO hooks below this line)
  // -------------------------------------------------------------------------
  if (!data) return <p className={styles.loading}>Loading…</p>;
  if (!data.fixture) return <p className={styles.error}>Fixture not found.</p>;

  // -------------------------------------------------------------------------
  // Derived values (safe to compute after early returns)
  // -------------------------------------------------------------------------
  const fixture = data.fixture;
  const odds = data.odds ?? [];

  const homeTeamId =
    fixture.provider_home_team_id ??
    fixture.home_team_id ??
    fixture.home_id ??
    fixture.homeTeamId;

  const awayTeamId =
    fixture.provider_away_team_id ??
    fixture.away_team_id ??
    fixture.away_id ??
    fixture.awayTeamId;

  const season = fixture.season ?? fixture.league_season ?? fixture.year ?? 2025;

  const leagueId =
    fixture.league_id ?? fixture.provider_league_id ?? fixture.api_league_id ?? null;

  const isHomeFav = favTeams.includes(fixture.home_team);
  const isAwayFav = favTeams.includes(fixture.away_team);
  const isLeagueFav = favLeagues.includes(fixture.comp);

  const grouped = Array.isArray(odds)
    ? odds.reduce((acc, o) => {
        (acc[o.market] ||= []).push(o);
        return acc;
      }, {})
    : {};

  const uniqueBookmakers = [...new Set(edges.map((e) => e.bookmaker))];
  const filteredEdges =
    selectedBookmaker === "All"
      ? edges
      : edges.filter((e) => e.bookmaker === selectedBookmaker);

  const clubHref = (teamId, teamName) => {
    if (!teamId) return null;
    const slug = slugifyTeamName(teamName);
    const params = new URLSearchParams();
    if (season) params.set("season", String(season));
    if (leagueId) params.set("league", String(leagueId));
    const qs = params.toString();
    return `/club/${teamId}/${slug}${qs ? `?${qs}` : ""}`;
  };

  // ✅ Prefer logo URLs that already came back on the fixture payload
  const pickLogoFromFixture = (side /* "home" | "away" */) => {
    const candidates =
      side === "home"
        ? [
            fixture.home_logo,
            fixture.homeTeamLogo,
            fixture.home_team_logo,
            fixture.home_logo_url,
            fixture.home_team?.logo,
            fixture.home?.logo,
            fixture.home_team_badge,
          ]
        : [
            fixture.away_logo,
            fixture.awayTeamLogo,
            fixture.away_team_logo,
            fixture.away_logo_url,
            fixture.away_team?.logo,
            fixture.away?.logo,
            fixture.away_team_badge,
          ];

    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
    }
    return null;
  };

  const homeLogoUrl = pickLogoFromFixture("home");
  const awayLogoUrl = pickLogoFromFixture("away");

  // fallback to local logos folder by slug if API didn’t provide it
  const homeLogoFallback = `/logos/${slugifyTeamName(fixture.home_team)}.png`;
  const awayLogoFallback = `/logos/${slugifyTeamName(fixture.away_team)}.png`;

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className={`${styles.page} scrollX`}>
      <div className={styles.headerBar}>
        <div className={styles.headerInner}>
          <button className={styles.backBtn} onClick={goBack}>
            ← Back to Fixtures
          </button>

          <div className={styles.headerTeams}>
            <div className={styles.teamWithLogo}>
              <img
                src={homeLogoUrl || homeLogoFallback}
                onError={(e) => (e.currentTarget.style.display = "none")}
                alt={fixture.home_team}
                className={styles.teamLogo}
              />

              {clubHref(homeTeamId, fixture.home_team) ? (
                <Link
                  to={clubHref(homeTeamId, fixture.home_team)}
                  className={styles.teamLink}
                  title={`Open ${fixture.home_team}`}
                >
                  {fixture.home_team}
                </Link>
              ) : (
                <span className={styles.teamLink} title="Team id missing">
                  {fixture.home_team}
                </span>
              )}

              <button
                type="button"
                onClick={() => toggleFavouriteTeam(fixture.home_team)}
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: isHomeFav ? "rgba(52,211,153,0.18)" : "rgba(0,0,0,0.25)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {isHomeFav ? "★ Saved" : "☆ Fav"}
              </button>
            </div>

            <span>vs</span>

            <div className={styles.teamWithLogo}>
              <img
                src={awayLogoUrl || awayLogoFallback}
                onError={(e) => (e.currentTarget.style.display = "none")}
                alt={fixture.away_team}
                className={styles.teamLogo}
              />

              {clubHref(awayTeamId, fixture.away_team) ? (
                <Link
                  to={clubHref(awayTeamId, fixture.away_team)}
                  className={styles.teamLink}
                  title={`Open ${fixture.away_team}`}
                >
                  {fixture.away_team}
                </Link>
              ) : (
                <span className={styles.teamLink} title="Team id missing">
                  {fixture.away_team}
                </span>
              )}

              <button
                type="button"
                onClick={() => toggleFavouriteTeam(fixture.away_team)}
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: isAwayFav ? "rgba(52,211,153,0.18)" : "rgba(0,0,0,0.25)",
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {isAwayFav ? "★ Saved" : "☆ Fav"}
              </button>
            </div>
          </div>

          <p className={styles.metaLine}>
            {fixture.comp} • {formatKickoff(fixture.kickoff_utc)}
            <button
              type="button"
              onClick={() => toggleFavouriteLeague(fixture.comp)}
              style={{
                marginLeft: 10,
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.25)",
                background: isLeagueFav ? "rgba(52,211,153,0.18)" : "rgba(0,0,0,0.35)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {isLeagueFav ? "★ League saved" : "☆ Fav league"}
            </button>
          </p>

          <div className={styles.tabs}>
            {["preview", "table", "predictions", "lineups", "players", "events"].map((tab) => (
              <button
                key={tab}
                className={
                  activeTab === tab
                    ? `${styles.tabButton} ${styles.activeTab}`
                    : styles.tabButton
                }
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.main}>
          {activeTab === "preview" && (
            <>
              <div className={styles.tabContent}>
                <MatchPreview fixtureId={fixtureIdNum} isAdmin={isAdminView} />
              </div>

              <div
                style={{
                  margin: "12px 0 16px",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(135deg, rgba(20,83,45,0.8), rgba(15,23,42,0.9))",
                  color: "#e5f4eb",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 13, flex: 1, minWidth: 200 }}>
                  <strong>Player stats & props</strong>
                  <br />
                  See shots, cards and season breakdowns for every player in this match.
                </div>
                <button
                  onClick={() => setActiveTab("players")}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(34,197,94,0.9)",
                    background: "rgba(22,163,74,0.9)",
                    color: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Open player stats →
                </button>
              </div>

              <div className={styles.bestEdges}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <h3>Best Edges</h3>
                  {edgesMeta && (
                    <FixtureAccessPill meta={edgesMeta} fixtureId={fixtureIdNum} variant="default" />
                  )}
                </div>

                {edgesMeta && (
                  <p className={styles.edgesMeta}>
                    {edgesMeta.hasFullAccess ? (
                      edgesMeta.isPremium ? (
                        <>
                          You’re on <b>CSB Premium</b> – full model edges unlocked for this fixture.
                        </>
                      ) : (
                        <>
                          This fixture is unlocked. You’ve used <b>{edgesMeta.usedToday}</b> /{" "}
                          <b>{edgesMeta.limit}</b> free fixture unlocks today.
                        </>
                      )
                    ) : (
                      <>
                        Free preview only – showing a small sample of edges. You’ve used{" "}
                        <b>{edgesMeta.usedToday}</b> / <b>{edgesMeta.limit}</b> free fixture unlocks today.{" "}
                        <Link to="/premium" style={{ color: "#FBBF24" }}>
                          Go Premium →
                        </Link>
                      </>
                    )}
                  </p>
                )}

                {uniqueBookmakers.length > 1 && (
                  <div className={styles.bookmakerFilter}>
                    <label>Filter by bookmaker: </label>
                    <select
                      value={selectedBookmaker}
                      onChange={(e) => setSelectedBookmaker(e.target.value)}
                    >
                      <option value="All">All</option>
                      {uniqueBookmakers.map((bm) => (
                        <option key={bm} value={bm}>
                          {bm}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <ul>
                  {filteredEdges.map((e, i) => {
                    const key = `${e.market}-${e.bookmaker}-${i}`;
                    const exp = explanations[e.market];
                    const eg = exp?.form?.expected_goals;

                    const egLine =
                      eg && typeof eg.home === "number" && typeof eg.away === "number"
                        ? `Expected goals: ${eg.home.toFixed(2)} + ${eg.away.toFixed(2)} = ${eg.total.toFixed(2)}`
                        : null;

                    return (
                      <li key={key}>
                        <b>{e.market}</b> — {e.bookmaker} @ <b>{formatOddsBoth(e.price)}</b>{" "}
                        {typeof e.edge === "number" && typeof e.prob === "number" ? (
                          <>
                            ({(e.edge * 100).toFixed(1)}% edge, model p {(e.prob * 100).toFixed(1)}%)
                          </>
                        ) : null}
                        <button
                          className={styles.whyButton}
                          onClick={() => fetchExplanation(e.market, i)}
                          style={{ marginLeft: 8 }}
                        >
                          Why?
                        </button>
                        <button
                          className={styles.addBetLink}
                          style={{ marginLeft: 8 }}
                          disabled={placingKey === key}
                          onClick={() => handlePlaceEdge(e, key)}
                        >
                          {placingKey === key ? "Adding…" : "Place Bet"}
                        </button>

                        {expandedWhy === i && exp && (
                          <div className={styles.whyBox}>
                            {egLine && <p>{egLine}</p>}
                            {(exp.notes || []).map((n, j) => (
                              <p key={j}>• {n}</p>
                            ))}
                            {exp.recommendation && (
                              <p>
                                <b>Recommendation:</b> {exp.recommendation}
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="scrollX">
                <OddsTable grouped={grouped} />
              </div>
            </>
          )}

          {activeTab === "table" && (
            <div className="scrollX">
              <table className={styles.oddsTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>GD</th>
                    <th>Pts</th>
                    <th>Form</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueTable.map((row, i) => {
                    const normalize = (name) =>
                      name
                        ?.toLowerCase()
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]/gi, "")
                        .trim();

                    const isHome = normalize(row.team) === normalize(fixture.home_team);
                    const isAway = normalize(row.team) === normalize(fixture.away_team);
                    const rowClass = isHome || isAway ? styles.highlightRow : "";

                    return (
                      <tr key={i} className={rowClass}>
                        <td>{row.position}</td>
                        <td className={styles.teamName}>
                          {row.team_id ? (
                            <Link
                              to={`/club/${row.team_id}/${slugifyTeamName(row.team)}`}
                              className={styles.teamLink}
                              title={`Open ${row.team}`}
                            >
                              {row.team}
                            </Link>
                          ) : (
                            <span className={styles.teamLink}>{row.team}</span>
                          )}
                          {isHome && <span> 🏠</span>}
                          {isAway && <span> 🛫</span>}
                        </td>
                        <td>{row.played}</td>
                        <td>{row.win}</td>
                        <td>{row.draw}</td>
                        <td>{row.lose}</td>
                        <td>{row.gf}</td>
                        <td>{row.ga}</td>
                        <td>{row.gf - row.ga}</td>
                        <td>{row.points}</td>
                        <td>{row.form || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "predictions" && <PredictionsSection fixtureId={id} />}

          {activeTab === "lineups" && (
            <div className={styles.tabContent}>
              <div className={styles.subTabs}>
                {["lineup", "injuries", "props"].map((sub) => (
                  <button
                    key={sub}
                    className={lineupTab === sub ? styles.activeTab : ""}
                    onClick={() => setLineupTab(sub)}
                  >
                    {sub.charAt(0).toUpperCase() + sub.slice(1)}
                  </button>
                ))}
              </div>

              {lineupTab === "lineup" && <LineupsSection fixtureId={id} />}
              {lineupTab === "injuries" && <InjuriesSection fixtureId={id} />}
              {lineupTab === "props" && (
                <PlayerPropsSection fixtureId={id} homeTeam={fixture.home_team} awayTeam={fixture.away_team} />
              )}
            </div>
          )}

          {activeTab === "players" && (
            <PlayersSection fixtureId={id} homeTeam={fixture.home_team} awayTeam={fixture.away_team} />
          )}

          {activeTab === "events" && <EventsSection fixtureId={id} />}
        </div>

        <div className={styles.side}>
          <Poll fixtureId={id} homeTeam={fixture.home_team} awayTeam={fixture.away_team} />

          {formData && (
            <div className={`${styles.formSection} ${styles.staticForm}`}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: "#666" }}>Form:</label>
                <select
                  value={formN}
                  onChange={(e) => setFormN(Number(e.target.value))}
                  style={{ fontSize: 12 }}
                >
                  {[3, 5, 7, 10].map((v) => (
                    <option key={v} value={v}>
                      last {v}
                    </option>
                  ))}
                </select>

                <label style={{ fontSize: 12, color: "#666", marginLeft: 6 }}>Scope:</label>
                <select
                  value={formScopeAll}
                  onChange={(e) => setFormScopeAll(Number(e.target.value))}
                  style={{ fontSize: 12 }}
                >
                  <option value={0}>This competition</option>
                  <option value={1}>All competitions</option>
                </select>
              </div>

              <FormBreakdown
                home={{ summary: formData.home.summary, recent: formData.home.recent }}
                away={{ summary: formData.away.summary, recent: formData.away.recent }}
                homeName={fixture.home_team}
                awayName={fixture.away_team}
                n={formData.n}
              />
            </div>
          )}

          <TeamContextPanel
            fixtureId={fixtureIdNum}
            homeTeam={fixture.home_team}
            awayTeam={fixture.away_team}
          />

          <LeagueFixtures fixtures={leagueFixtures} />
        </div>
      </div>
    </div>
  );
};

export default FixturePage;