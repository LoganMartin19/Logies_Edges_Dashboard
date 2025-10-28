// File: FixturePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
import { api } from "../api"; // env-based axios client

// --- tiny responsive helper (no CSS changes required) -----------------------
const useIsMobile = (bp = 780) => {
  const [m, setM] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < bp : false
  );
  useEffect(() => {
    const onR = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [bp]);
  return m;
};

const FixturePage = () => {
  const { id } = useParams();
  const fixtureIdNum = Number(id);
  const isAdminView =
    typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  const isMobile = useIsMobile();

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
  const [teamStats, setTeamStats] = useState(null); // kept (future use)

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

  // Reset explanations when fixture changes
  useEffect(() => {
    setExplanations({});
    setExpandedWhy(null);
  }, [id]);

  // ------- Effects -------
  useEffect(() => {
    const fetchFixture = async () => {
      try {
        const { data: fixtureJson } = await api.get(`/api/fixtures/id/${id}/json`);
        setData(fixtureJson);

        const { data: roundData } = await api.get(`/api/fixtures/round`, {
          params: { fixture_id: id },
        });
        setLeagueFixtures(roundData);

        // new form endpoint (your hybrid supports both shapes)
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
        const { data: json } = await api.get(`/shortlist/today`, {
          params: { min_edge: 0.0, send_alerts: 0 },
        });
        setEdges((json || []).filter((e) => e.fixture_id === Number(id)));
      } catch (err) {
        console.error("Error fetching shortlist edges:", err);
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

  // ------- “Why?” fetcher -------
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

  // ------- guards -------
  if (!data) return <p className={styles.loading}>Loading...</p>;
  if (!data.fixture) return <p className={styles.error}>Fixture not found.</p>;

  const fixture = data.fixture;
  const odds = data.odds ?? [];

  const grouped = useMemo(
    () =>
      Array.isArray(odds)
        ? odds.reduce((acc, o) => {
            (acc[o.market] ||= []).push(o);
            return acc;
          }, {})
        : {},
    [odds]
  );

  const uniqueBookmakers = [...new Set(edges.map((e) => e.bookmaker))];
  const filteredEdges = (selectedBookmaker === "All"
    ? edges
    : edges.filter((e) => e.bookmaker === selectedBookmaker)
  ).sort((a, b) => b.edge - a.edge);

  const matchLabel = `${fixture.home_team} v ${fixture.away_team}`;

  return (
    <div className={styles.page}>
      {/* Sticky header bar (works with/without CSS) */}
      <div
        className={styles.headerBar}
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,.06)",
        }}
      >
        <div className={styles.headerInner} style={{ padding: isMobile ? "10px 12px" : "14px 16px" }}>
          <div
            className={styles.headerTeams}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "space-between",
            }}
          >
            <div className={styles.teamWithLogo} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                loading="lazy"
                src={`/logos/${slugifyTeamName(fixture.home_team)}.png`}
                alt={fixture.home_team}
                className={styles.teamLogo}
                style={{ width: 28, height: 28, objectFit: "contain" }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <b>{fixture.home_team}</b>
            </div>
            <span style={{ opacity: 0.6 }}>vs</span>
            <div className={styles.teamWithLogo} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                loading="lazy"
                src={`/logos/${slugifyTeamName(fixture.away_team)}.png`}
                alt={fixture.away_team}
                className={styles.teamLogo}
                style={{ width: 28, height: 28, objectFit: "contain" }}
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <b>{fixture.away_team}</b>
            </div>
          </div>

          <p className={styles.metaLine} style={{ margin: "6px 0 10px 0", color: "#555" }}>
            {fixture.comp} • {formatKickoff(fixture.kickoff_utc)}
          </p>

          <div
            className={styles.tabs}
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {["preview", "table", "predictions", "lineups", "events"].map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? styles.activeTab : ""}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  background: activeTab === tab ? "#111" : "#fff",
                  color: activeTab === tab ? "#fff" : "#111",
                  fontSize: 13,
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body: on mobile we stack; on desktop we keep 2-column */}
      <div
        className={styles.body}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) 320px",
          gap: 16,
          padding: isMobile ? 12 : 16,
        }}
      >
        {/* MAIN */}
        <div className={styles.main}>
          {activeTab === "preview" && (
            <>
              <div className={styles.tabContent} style={{ marginBottom: 14 }}>
                <MatchPreview fixtureId={fixtureIdNum} isAdmin={isAdminView} />
              </div>

              {/* Best Edges */}
              <div
                className={styles.bestEdges}
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                  }}
                >
                  <h3 style={{ margin: 0 }}>Best Edges</h3>
                  {uniqueBookmakers.length > 1 && (
                    <div className={styles.bookmakerFilter} style={{ fontSize: 13 }}>
                      <label htmlFor="bookmaker-select">Book: </label>
                      <select
                        id="bookmaker-select"
                        value={selectedBookmaker}
                        onChange={(e) => setSelectedBookmaker(e.target.value)}
                        style={{ padding: "4px 8px", borderRadius: 8, border: "1px solid #ddd" }}
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
                </div>

                <ul style={{ paddingLeft: 16, marginTop: 10 }}>
                  {filteredEdges.map((e, i) => {
                    const addBetHref = buildBetPrefill({
                      teams: matchLabel,
                      comp: fixture.comp,
                      market: e.market,
                      bookmaker: e.bookmaker,
                      price: e.price,
                    });
                    const exp = explanations[e.market];
                    const eg = exp?.form?.expected_goals;
                    const egLine =
                      eg && typeof eg.home === "number" && typeof eg.away === "number"
                        ? `Expected goals: ${eg.home.toFixed(2)} + ${eg.away.toFixed(2)} = ${eg.total.toFixed(2)}`
                        : null;

                    return (
                      <li key={`${e.market}-${e.bookmaker}-${i}`} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <b style={{ whiteSpace: "nowrap" }}>{e.market}</b>
                          <span style={{ opacity: 0.8 }}>
                            — {e.bookmaker} @ {Number(e.price).toFixed(2)} (
                            {(e.edge * 100).toFixed(1)}% edge, p {(e.prob * 100).toFixed(1)}%)
                          </span>
                          <button
                            className={styles.whyButton}
                            onClick={() => fetchExplanation(e.market, i)}
                            title="Explain this market"
                            style={{
                              marginLeft: "auto",
                              padding: "4px 8px",
                              borderRadius: 8,
                              border: "1px solid #ddd",
                              background: "#fafafa",
                              cursor: "pointer",
                              fontSize: 12,
                            }}
                          >
                            Why?
                          </button>
                          <Link
                            to={addBetHref}
                            className={styles.addBetLink}
                            title="Prefill this bet"
                            style={{ fontSize: 12, textDecoration: "none" }}
                          >
                            ➕ Add Bet
                          </Link>
                        </div>

                        {expandedWhy === i && exp && (
                          <div
                            className={styles.whyBox}
                            style={{
                              background: "#f7f9fb",
                              border: "1px solid #e6eef6",
                              borderRadius: 10,
                              padding: 10,
                              marginTop: 8,
                              fontSize: 13,
                            }}
                          >
                            {egLine && <p style={{ margin: "4px 0" }}>{egLine}</p>}
                            {(exp.notes || []).map((n, j) => (
                              <p key={j} style={{ margin: "4px 0" }}>
                                • {n}
                              </p>
                            ))}
                            {exp.recommendation && (
                              <p style={{ margin: "6px 0 0 0" }}>
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

              {/* Odds */}
              <div style={{ marginBottom: 18 }}>
                <OddsTable grouped={grouped} />
              </div>
            </>
          )}

          {activeTab === "table" && (
            <div className={styles.tabContent}>
              <h3>League Table</h3>
              {leagueTable.length ? (
                <div style={{ overflowX: "auto" }}>
                  <table className={styles.oddsTable} style={{ minWidth: 680 }}>
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
                            .replace(
                              /\b(fc|sc|cf|afc|cfr|calcio|club|de|atletico|internazionale|sporting|munchen|glimt|bodø)\b/g,
                              ""
                            )
                            .replace(/\s+/g, "")
                            .trim();

                        const normRow = normalize(row.team);
                        const normHome = normalize(fixture.home_team);
                        const normAway = normalize(fixture.away_team);

                        const isHome = normRow === normHome;
                        const isAway = normRow === normAway;
                        const rowClass = isHome || isAway ? styles.highlightRow : "";

                        return (
                          <tr key={i} className={rowClass}>
                            <td>{row.position}</td>
                            <td className={styles.teamName}>
                              {row.team}
                              {isHome && <span title="Home Team"> 🏠</span>}
                              {isAway && <span title="Away Team"> 🛫</span>}
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
              ) : (
                <p>No table available.</p>
              )}
            </div>
          )}

          {activeTab === "predictions" && <PredictionsSection fixtureId={id} />}

          {activeTab === "lineups" && (
            <div className={styles.tabContent}>
              <div
                className={styles.subTabs}
                style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
              >
                {["lineup", "players", "injuries", "props"].map((sub) => (
                  <button
                    key={sub}
                    className={lineupTab === sub ? styles.activeTab : ""}
                    onClick={() => setLineupTab(sub)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      background: lineupTab === sub ? "#111" : "#fff",
                      color: lineupTab === sub ? "#fff" : "#111",
                      fontSize: 13,
                    }}
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

        {/* SIDE — on mobile this naturally stacks below */}
        <div className={styles.side}>
          <div style={{ marginBottom: 16 }}>
            <Poll fixtureId={id} homeTeam={fixture.home_team} awayTeam={fixture.away_team} />
          </div>

          {formData && (
            <div className={`${styles.formSection} ${styles.staticForm}`} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <label style={{ fontSize: 12, color: "#666" }}>Form:</label>
                <select
                  value={formN}
                  onChange={(e) => setFormN(Number(e.target.value))}
                  style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, border: "1px solid #ddd" }}
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
                  style={{ fontSize: 12, padding: "4px 8px", borderRadius: 8, border: "1px solid #ddd" }}
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

          <div>
            <LeagueFixtures fixtures={leagueFixtures} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FixturePage;