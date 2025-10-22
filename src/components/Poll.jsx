// src/components/Poll.jsx
import React, { useEffect, useState } from "react";
import styles from "../styles/FixturePage.module.css";

export default function Poll({ fixtureId, homeTeam, awayTeam }) {
  const [results, setResults] = useState({ home: 0, draw: 0, away: 0 });
  const [total, setTotal] = useState(0);
  const [vote, setVote] = useState(null);

  const load = async () => {
    const res = await fetch(`http://127.0.0.1:8000/poll/results?fixture_id=${fixtureId}`);
    const json = await res.json();
    setResults(json.results || { home: 0, draw: 0, away: 0 });
    setTotal(json.total ?? 0);
  };

  useEffect(() => { load(); }, [fixtureId]);

  const cast = async (choice) => {
    await fetch(`http://127.0.0.1:8000/poll/vote?fixture_id=${fixtureId}&choice=${choice}`, {
      method: "POST",
    });
    setVote(choice);
    load();
  };

  return (
    <div className={styles.poll}>
      <h3>Who wins?</h3>
      <div className={styles.pollOptions}>
        <div className={styles.pollChoice}>
          <button
            className={`${styles.pollButton} ${vote === "home" ? styles.active : ""}`}
            onClick={() => cast("home")}
          >
            <img
              src={`/logos/${homeTeam.toLowerCase().replace(/ /g, "_")}.png`}
              alt={homeTeam}
              className={styles.teamLogo}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            {homeTeam}
          </button>
          <div className={styles.pollPercent}>{results.home?.toFixed(1)}%</div>
        </div>

        <div className={styles.pollChoice}>
          <button
            className={`${styles.pollButton} ${vote === "draw" ? styles.active : ""}`}
            onClick={() => cast("draw")}
          >
            Draw
          </button>
          <div className={styles.pollPercent}>{results.draw?.toFixed(1)}%</div>
        </div>

        <div className={styles.pollChoice}>
          <button
            className={`${styles.pollButton} ${vote === "away" ? styles.active : ""}`}
            onClick={() => cast("away")}
          >
            <img
              src={`/logos/${awayTeam.toLowerCase().replace(/ /g, "_")}.png`}
              alt={awayTeam}
              className={styles.teamLogo}
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            {awayTeam}
          </button>
          <div className={styles.pollPercent}>{results.away?.toFixed(1)}%</div>
        </div>
      </div>

      {/* ✅ Total votes added back cleanly */}
      <div className={styles.totalVotes}>
        Total votes: {total}
      </div>
    </div>
  );
}