// File: FixturePage.jsx
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
import { api } from "../api";

const FixturePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const goBack = () => {
    // If user navigated here from another page, go back; else fallback to fixtures index
    if (window.history.length > 1) navigate(-1);
    else navigate("/fixtures");
 };

  const fixtureIdNum = Number(id);
  const isAdminView =
    typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

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
  const [explanations, setExplanations] = useState({});
  const [expandedWhy, setExpandedWhy] = useState(null);
  const [teamStats, setTeamStats] = useState(null);

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

  const buildBetPrefill = ({ teams, comp, market, bookmaker, price, stake = "" }) => {
    const qs = new URLSearchParams({
      fixture_id: String(id),
      teams: teams || "",
      comp: comp || "",
      market: market || "",
      bookmaker: bookmaker || "",
      price: price != null ? String(price) : "",
      stake,
      notes: "",
    });
    return `/bets?${qs.toString()}`;
  };

  const normalizeExplainMarket = (raw) => {
    if (!raw) return "";
    let x = String(raw).toUpperCase().replace(/\s+/g, "");
    const syn = {
      BTTSYES: "BTTS_Y",
      BTTSY: "BTTS_Y",
      BOTHTEAMSTOSCOREYES: "BTTS_Y",
      BTTSNO: "BTTS_N",
      BTTSN: "BTTS_N",
      BOTHTEAMSTOSCORENO: "BTTS_N",
      HOMEWIN: "HOME_WIN",
      AWAYWIN: "AWAY_WIN",
    };
    if (syn[x]) return syn[x];
    const ou =
      x.match(/^O?VER?(\d+(?:\.\d+)?)$/) || x.match(/^U?N?DER?(\d+(?:\.\d+)?)$/);
    if (ou) {
      if (/^O(VER)?\d/.test(x)) return `O${x.replace(/^O(VER)?/, "")}`;
      if (/^U(NDER)?\d/.test(x)) return `U${x.replace(/^U(NDER)?/, "")}`;
    }
    if (/^O\d+(\.\d+)?$/.test(x) || /^U\d+(\.\d+)?$/.test(x)) return x;
    return x;
  };

  useEffect(() => {
    setExplanations({});
    setExpandedWhy(null);
  }, [id]);

  useEffect(() => {
    const fetchFixture = async () => {
      try {
        const { data: fixtureJson } = await api.get(`/api/fixtures/id/${id}/json`);
        setData(fixtureJson);

        const { data: roundData } = await api.get(`/api/fixtures/round`, {
          params: { fixture_id: id },
        });
        setLeagueFixtures(roundData);

        const { data: fj } = await api.get(`/form/form/fixture`, {
          params: { fixture_id: id, n: formN, all_comps: formScopeAll },
        });
        const normalized = {
          home: fj.home ?? { summary: fj.home_form ?? {}, recent: fj.home_recent ?? [] },
          away: fj.away ?? { summary: fj.away_form ?? {}, recent: fj.away_recent ?? [] },
          n: fj.n ?? formN,
        };
        setFormData(normalized);
      } catch (err) {
        console.error("Error fetching fixture:", err);
      }
    };
    fetchFixture();
  }, [id, formN, formScopeAll]);

  useEffect(() => {
    if (!data?.fixture?.comp) return;
    const fetchTable = async () => {
      try {
        const { data: tableJson } = await api.get(`/api/fixtures/league/table`, {
          params: { league: data.fixture.comp },
        });
        if (Array.isArray(tableJson)) setLeagueTable(tableJson);
        else if (Array.isArray(tableJson.table)) setLeagueTable(tableJson.table);
        else setLeagueTable([]);
      } catch (err) {
        console.error("Error fetching league table:", err);
        setLeagueTable([]);
      }
    };
    fetchTable();
  }, [data?.fixture?.comp]);

  useEffect(() => {
    const fetchEdges = async () => {
      try {
        // Direct, per-fixture endpoint you tested with curl
        const { data: json } = await api.get(`/api/ai/preview/edges`, {
          params: { fixture_id: id, source: "team_form" },
        });
        // json is an array of edges for THIS fixture already
        setEdges(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Error fetching best edges:", err);
        setEdges([]);
      }
    };
    fetchEdges();
  }, [id]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: json } = await api.get(`/football/team-stats`, {
          params: { fixture_id: id },
        });
        setTeamStats(json);
      } catch (err) {
        console.error("Error fetching team stats:", err);
      }
    };
    fetchStats();
  }, [id]);

  const fetchExplanation = async (rawMarket, index) => {
    if (explanations[rawMarket]) {
      setExpandedWhy(expandedWhy === index ? null : index);
      return;
    }

    const market = normalizeExplainMarket(rawMarket);
    const controller = new AbortController();
    const ts = Date.now();

    try {
      const { data: json } = await api.get(`/explain/probability`, {
        params: { fixture_id: id, market, _ts: ts },
        signal: controller.signal,
      });
      setExplanations((prev) => ({ ...prev, [rawMarket]: json }));
      setExpandedWhy(index);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching explanation:", err);
      }
    }
    return () => controller.abort();
  };

  if (!data) return <p className={styles.loading}>Loading...</p>;
  if (!data.fixture) return <p className={styles.error}>Fixture not found.</p>;

  const fixture = data.fixture;
  const odds = data.odds ?? [];

  const grouped = Array.isArray(odds)
    ? odds.reduce((acc, o) => {
        (acc[o.market] ||= []).push(o);
        return acc;
      }, {})
    : {};

  const uniqueBookmakers = [...new Set(edges.map((e) => e.bookmaker))];
  const filteredEdges = (selectedBookmaker === "All"
    ? edges
    : edges.filter((e) => e.bookmaker === selectedBookmaker)
  ).sort((a, b) => b.edge - a.edge);

  const matchLabel = `${fixture.home_team} v ${fixture.away_team}`;

  return (
    <div className={`${styles.page} scrollX`}>
      <div className={styles.headerBar}>
        <div className={styles.headerInner}>
          <button className={styles.backBtn} onClick={goBack} aria-label="Back to Fixtures">
            ← Back to Fixtures
          </button>
          <div className={styles.headerTeams}>
            <div className={styles.teamWithLogo}>
              <img
                src={`/logos/${slugifyTeamName(fixture.home_team)}.png`}
                alt={fixture.home_team}
                className={styles.teamLogo}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              {fixture.home_team}
            </div>
            <span>vs</span>
            <div className={styles.teamWithLogo}>
              <img
                src={`/logos/${slugifyTeamName(fixture.away_team)}.png`}
                alt={fixture.away_team}
                className={styles.teamLogo}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              {fixture.away_team}
            </div>
          </div>
          <p className={styles.metaLine}>
            {fixture.comp} • {formatKickoff(fixture.kickoff_utc)}
          </p>

          <div className={styles.tabs}>
            {["preview", "table", "predictions", "lineups", "events"].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? styles.activeTab : ""}
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

              <div className={styles.bestEdges}>
                <h3>Best Edges</h3>
                {uniqueBookmakers.length > 1 && (
                  <div className={styles.bookmakerFilter}>
                    <label htmlFor="bookmaker-select">Filter by bookmaker: </label>
                    <select
                      id="bookmaker-select"
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
                    const addBetHref = buildBetPrefill({
                      teams: matchLabel,
                      comp: fixture.comp,
                      market: e.market,
                      bookmaker: e.bookmaker,
                      price: e.price,
                      stake: "",
                    });
                    const exp = explanations[e.market];
                    const eg = exp?.form?.expected_goals;
                    const egLine =
                      eg && typeof eg.home === "number" && typeof eg.away === "number"
                        ? `Expected goals: ${eg.home.toFixed(2)} + ${eg.away.toFixed(2)} = ${eg.total.toFixed(2)}`
                        : null;

                    return (
                      <li key={`${e.market}-${e.bookmaker}-${i}`}>
                        <b>{e.market}</b> — {e.bookmaker} @ {e.price} (
                        {(e.edge * 100).toFixed(1)}% edge, model p {(e.prob * 100).toFixed(1)}%)
                        <button
                          className={styles.whyButton}
                          onClick={() => fetchExplanation(e.market, i)}
                          title="Explain this market"
                          style={{ marginLeft: 8 }}
                        >
                          Why?
                        </button>
                        <Link
                          to={addBetHref}
                          className={styles.addBetLink}
                          style={{ marginLeft: 8 }}
                        >
                          ➕ Add Bet
                        </Link>

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

              {/* scrollable wrapper for mobile odds table */}
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
                          {row.team}
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
                {["lineup", "players", "injuries", "props"].map((sub) => (
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
              {lineupTab === "players" && (
                <PlayersSection
                  fixtureId={id}
                  homeTeam={fixture.home_team}
                  awayTeam={fixture.away_team}
                />
              )}
              {lineupTab === "injuries" && <InjuriesSection fixtureId={id} />}
              {lineupTab === "props" && (
                <PlayerPropsSection
                  fixtureId={id}
                  homeTeam={fixture.home_team}
                  awayTeam={fixture.away_team}
                />
              )}
            </div>
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
                home={{ summary: formData.home?.summary, recent: formData.home?.recent }}
                away={{ summary: formData.away?.summary, recent: formData.away?.recent }}
                n={formData.n}
              />
            </div>
          )}
          <LeagueFixtures fixtures={leagueFixtures} />
        </div>
      </div>
    </div>
  );
};

export default FixturePage;