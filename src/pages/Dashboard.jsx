// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/Dashboard.module.css";
import { slugifyTeamName } from "../utils/slugify";
import PredictionPanel from "../components/PredictionPanel";
import ShortlistSendPanel from "../components/ShortlistSendPanel";
// import BetTracker from "../components/BetTracker"; // ← optional

const Dashboard = () => {
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLeagues, setExpandedLeagues] = useState({});

  // controls for shortlist fetch
  const [hoursAhead, setHoursAhead] = useState(48);
  const [minEdge, setMinEdge] = useState(-1);
  const [preferBook, setPreferBook] = useState("");
  const [leagues, setLeagues] = useState("");

  const formatKickoff = (utcString) => {
    if (!utcString) return "";
    const kickoff = utcString.endsWith("Z") ? utcString : utcString + "Z";
    return new Date(kickoff).toLocaleString(navigator.language, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const buildShortlistUrl = useCallback(() => {
    const qs = new URLSearchParams();
    qs.set("hours_ahead", String(hoursAhead));
    qs.set("min_edge", String(minEdge));
    qs.set("send_alerts", "0"); // never auto-send from dashboard
    if (preferBook.trim()) qs.set("prefer_book", preferBook.trim());
    if (leagues.trim()) qs.set("leagues", leagues.trim());
    return `http://127.0.0.1:8000/shortlist/today?${qs.toString()}`;
  }, [hoursAhead, minEdge, preferBook, leagues]);

  const loadShortlist = useCallback(() => {
    setLoading(true);
    fetch(buildShortlistUrl())
      .then((res) => res.json())
      .then((data) => {
        setEdges(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching shortlist:", err);
        setLoading(false);
      });
  }, [buildShortlistUrl]);

  useEffect(() => {
    loadShortlist();
  }, [loadShortlist]);

  // Group fixtures by league
  const leagueMap = useMemo(() => {
    const map = {};
    edges.forEach((edge) => {
      const league = edge.comp || "Other";
      if (!map[league]) map[league] = [];
      map[league].push(edge);
    });
    return map;
  }, [edges]);

  const toggleLeague = (league) => {
    setExpandedLeagues((prev) => ({
      ...prev,
      [league]: !prev[league],
    }));
  };

  return (
    <div className={styles.dashboard}>
      <h1 className={styles.title}>Logie’s Edges ⚡</h1>

      {/* Controls for shortlist query */}
      <div className={styles.controlsRow}>
        <div className={styles.control}>
          <label>Hours ahead</label>
          <input
            type="number"
            min={1}
            max={14 * 24}
            value={hoursAhead}
            onChange={(e) => setHoursAhead(Number(e.target.value || 0))}
          />
        </div>
        <div className={styles.control}>
          <label>Min edge</label>
          <input
            type="number"
            step="0.01"
            value={minEdge}
            onChange={(e) => setMinEdge(Number(e.target.value))}
          />
        </div>
        <div className={styles.control}>
          <label>Prefer bookmaker</label>
          <input
            type="text"
            placeholder="e.g. Bet365"
            value={preferBook}
            onChange={(e) => setPreferBook(e.target.value)}
          />
        </div>
        <div className={styles.control} style={{ flex: 1 }}>
          <label>Leagues (CSV)</label>
          <input
            type="text"
            placeholder="Premier League, Serie A"
            value={leagues}
            onChange={(e) => setLeagues(e.target.value)}
          />
        </div>
        <button className={styles.refreshBtn} onClick={loadShortlist}>
          Refresh
        </button>
      </div>

      {/* 🔮 Prediction search */}
      <div style={{ marginBottom: 24 }}>
        <PredictionPanel />
      </div>

      {/* ✅ Review & Send shortlist alerts (manual selection) */}
      <ShortlistSendPanel
        defaultHoursAhead={hoursAhead}
        defaultMinEdge={minEdge}
        defaultPreferBook={preferBook}
        defaultLeagues={leagues}
        onSent={loadShortlist} // refresh edges after sending
      />

      {/* Optional Bet Tracker – uncomment import & block to show */}
      {/*
      <div style={{ marginTop: 24 }}>
        <BetTracker />
      </div>
      */}

      {loading ? (
        <p>Loading fixtures...</p>
      ) : Object.keys(leagueMap).length > 0 ? (
        Object.entries(leagueMap).map(([league, leagueEdges]) => (
          <div key={league} className={styles.leagueGroup}>
            <button
              className={styles.leagueToggle}
              onClick={() => toggleLeague(league)}
            >
              {expandedLeagues[league] ? "▼" : "▶"} {league}
            </button>

            {expandedLeagues[league] && (
              <div className={styles.fixtureList}>
                {[...new Set(leagueEdges.map((e) => e.fixture_id))].map(
                  (fixtureId) => {
                    const edge = leagueEdges.find((e) => e.fixture_id === fixtureId);
                    if (!edge) return null;
                    return (
                      <Link
                        to={`/fixture/${edge.fixture_id}`}
                        key={edge.fixture_id}
                        className={styles.fixtureCard}
                      >
                        <div className={styles.teams}>
                          <img
                            src={`/logos/${slugifyTeamName(edge.home_team)}.png`}
                            alt={edge.home_team}
                            className={styles.teamLogo}
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                          <span className={styles.teamName}>{edge.home_team}</span>
                          <span className={styles.vs}>vs</span>
                          <span className={styles.teamName}>{edge.away_team}</span>
                          <img
                            src={`/logos/${slugifyTeamName(edge.away_team)}.png`}
                            alt={edge.away_team}
                            className={styles.teamLogo}
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        </div>
                        <div className={styles.kickoff}>
                          {formatKickoff(edge.kickoff_utc)}
                        </div>
                        <div className={styles.comp}>{edge.comp}</div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </div>
        ))
      ) : (
        <p>No fixtures found.</p>
      )}
    </div>
  );
};

export default Dashboard;