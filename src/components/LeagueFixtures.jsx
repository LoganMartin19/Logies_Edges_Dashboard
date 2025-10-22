// src/components/LeagueFixtures.jsx
import React from "react";
import { Link } from "react-router-dom";
import styles from "../styles/LeagueFixtures.module.css";
import { slugifyTeamName } from "../utils/slugify"; // ✅ reuse helper

const LeagueFixtures = ({ fixtures }) => {
  if (!fixtures || !Array.isArray(fixtures) || fixtures.length === 0) {
    return <p className={styles.empty}>No other fixtures available.</p>;
  }

  // ---- Helper: format kickoff in user timezone ----
  const formatKickoff = (utcString) => {
    if (!utcString) return "";
    const kickoff = utcString.endsWith("Z") ? utcString : utcString + "Z"; // ensure UTC
    return new Date(kickoff).toLocaleTimeString(navigator.language, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>Other Fixtures</h3>
      <ul className={styles.list}>
        {fixtures.map((f) => (
          <li key={f.id} className={styles.item}>
            <Link to={`/fixture/${f.id}`} className={styles.link}>
              <div className={styles.teams}>
                <img
                  src={`/logos/${slugifyTeamName(f.home_team)}.png`}
                  alt={f.home_team}
                  className={styles.teamLogo}
                  onError={(e) => (e.target.style.display = "none")}
                />
                <span className={styles.teamName}>{f.home_team}</span>
                <span className={styles.vs}>vs</span>
                <span className={styles.teamName}>{f.away_team}</span>
                <img
                  src={`/logos/${slugifyTeamName(f.away_team)}.png`}
                  alt={f.away_team}
                  className={styles.teamLogo}
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>
              <div className={styles.kickoff}>{formatKickoff(f.kickoff_utc)}</div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LeagueFixtures;