// src/components/LineupsSection.jsx
import React, { useEffect, useState } from "react";
import styles from "../styles/FixturePage.module.css";

const LineupsSection = ({ fixtureId }) => {
  const [lineups, setLineups] = useState([]);

  useEffect(() => {
    const fetchLineups = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/football/lineups?fixture_id=${fixtureId}`
        );
        const json = await res.json();
        setLineups(json?.response || []);
      } catch (err) {
        console.error("Error fetching lineups:", err);
      }
    };
    fetchLineups();
  }, [fixtureId]);

  if (!lineups.length) {
    return <p>No lineup data available yet.</p>;
  }

  const renderPlayer = (p, isSub = false) => {
    const pos = p.player?.pos || "?";
    return (
      <div
        key={p.player?.id}
        className={`${styles.playerMiniCard} ${isSub ? styles.subPlayer : ""}`}
      >
        {p.player?.photo && (
          <img
            src={p.player.photo}
            alt={p.player.name}
            className={styles.playerPhotoSmall}
          />
        )}
        <div>
          <b>{p.player?.name}</b> <span>({pos})</span>
          {p.player?.number && <span> #{p.player.number}</span>}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.tabContent}>
      <h3>Lineups</h3>
      {lineups.map((team, i) => (
        <div key={i} className={styles.lineupBlock}>
          <h4>
            {team.team?.name} — Formation: {team.formation || "N/A"}
          </h4>

          {/* Starting XI grouped by pos */}
          <div className={styles.formation}>
            {["G", "D", "M", "F"].map((pos) => {
              const starters = team.startXI?.filter(
                (p) => p.player?.pos === pos
              );
              if (!starters?.length) return null;
              return (
                <div key={pos} className={styles.lineupRow}>
                  {starters.map((p) => renderPlayer(p))}
                </div>
              );
            })}
          </div>

          {/* Substitutes */}
          {team.substitutes?.length > 0 && (
            <>
              <h5>Substitutes</h5>
              <div className={styles.subsList}>
                {team.substitutes.map((p) => renderPlayer(p, true))}
              </div>
            </>
          )}

          {/* Substitution Events */}
          {team.substitutions?.length > 0 && (
            <>
              <h5>Substitutions</h5>
              <ul>
                {team.substitutions.map((s, idx) => (
                  <li key={idx}>
                    <span>↩️ {s.playerOut?.name}</span> →{" "}
                    <span>↪️ {s.playerIn?.name}</span>{" "}
                    <span>({s.minute}’)</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default LineupsSection;