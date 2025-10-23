// src/components/Poll.jsx
import React, { useEffect, useState } from "react";
import styles from "../styles/FixturePage.module.css";
import { api } from "../api"; // ✅ env-based axios client

export default function Poll({ fixtureId, homeTeam, awayTeam }) {
  const [results, setResults] = useState({ home: 0, draw: 0, away: 0 });
  const [total, setTotal] = useState(0);
  const [vote, setVote] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/poll/results", { params: { fixture_id: fixtureId } });
      setResults(data?.results || { home: 0, draw: 0, away: 0 });
      setTotal(data?.total ?? 0);
    } catch (e) {
      // keep UI calm; log for debugging
      console.error("Poll load failed:", e);
      setResults({ home: 0, draw: 0, away: 0 });
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [fixtureId]);

  const cast = async (choice) => {
    try {
      setVote(choice); // optimistic
      await api.post("/poll/vote", null, { params: { fixture_id: fixtureId, choice } });
      await load();
    } catch (e) {
      console.error("Vote failed:", e);
    }
  };

  return (
    <div className={styles.poll}>
      <h3>Who wins?</h3>

      <div className={styles.pollOptions} aria-busy={loading ? "true" : "false"}>
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

      <div className={styles.totalVotes}>Total votes: {total}</div>
    </div>
  );
}