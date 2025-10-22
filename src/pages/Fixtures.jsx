// src/pages/Fixtures.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/Fixtures.module.css";

const Fixtures = () => {
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
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, // user tz
    });
  };

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/fixtures/all");
        const json = await res.json();
        setFixtures(Array.isArray(json) ? json : []);
      } catch (err) {
        console.error("Error fetching fixtures:", err);
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFixtures();
  }, []);

  if (loading) return <p className={styles.loading}>Loading fixtures...</p>;
  if (!fixtures.length) return <p className={styles.empty}>No fixtures available.</p>;

  // Group fixtures by competition + date
  const grouped = fixtures.reduce((acc, f) => {
    const date = formatKickoff(f.kickoff_utc, true); // includes weekday + date
    const key = `${f.comp} • ${date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>All Fixtures</h2>
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

export default Fixtures;