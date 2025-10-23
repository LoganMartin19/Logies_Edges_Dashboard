// src/pages/FootballGames.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/Fixtures.module.css";
import { api } from "../api"; // env-based axios client

const FootballGames = () => {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- Helper: format kickoff in user timezone ----
  const formatKickoff = (utcString, withDate = false) => {
    if (!utcString) return "";
    const kickoff = utcString.endsWith("Z") ? utcString : utcString + "Z"; // ensure UTC
    return new Date(kickoff).toLocaleString(navigator.language, {
      weekday: withDate ? "short" : undefined,
      day: withDate ? "numeric" : undefined,
      month: withDate ? "short" : undefined,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        // Pull all fixtures, then filter to football in case the API doesn't accept a sport param here.
        const { data } = await api.get("/api/fixtures/all");
        const rows = Array.isArray(data) ? data : [];
        const footballOnly = rows.filter(
          (f) => (f.sport || "football").toLowerCase() === "football"
        );
        setFixtures(footballOnly);
      } catch (err) {
        console.error("Error fetching football fixtures:", err);
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFixtures();
  }, []);

  if (loading) return <p className={styles.loading}>Loading football fixtures...</p>;
  if (!fixtures.length) return <p className={styles.empty}>No football fixtures available.</p>;

  // Group by competition + date
  const grouped = fixtures.reduce((acc, f) => {
    const date = formatKickoff(f.kickoff_utc, true); // includes weekday + date
    const key = `${f.comp} • ${date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>Football Fixtures</h2>
      {Object.keys(grouped).map((group) => (
        <div key={group} className={styles.group}>
          <h3 className={styles.groupTitle}>{group}</h3>
          <div className={styles.cards}>
            {grouped[group].map((f) => (
              <Link key={f.id} to={`/fixture/${f.id}`} className={styles.card}>
                <div className={styles.teams}>
                  {f.home_team} <span className={styles.vs}>vs</span> {f.away_team}
                </div>
                <div className={styles.kickoff}>{formatKickoff(f.kickoff_utc)}</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FootballGames;