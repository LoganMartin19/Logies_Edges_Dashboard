// File: src/components/InjuriesSection.jsx
import React, { useEffect, useState, useMemo } from "react";
import { api } from "../api"; // ✅ env-based axios client
import styles from "../styles/FixturePage.module.css";

const InjuriesSection = ({ fixtureId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!fixtureId) return;
    let alive = true;

    (async () => {
      try {
        const res = await api.get("/football/injuries", { params: { fixture_id: fixtureId } });
        if (alive) setData(res.data);
      } catch (err) {
        console.error("Error fetching injuries:", err);
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [fixtureId]);

  // Normalize to arrays regardless of backend shape
  const { homeList, awayList, homeTeamName, awayTeamName } = useMemo(() => {
    const payload = data || {};

    // New flattened shape
    const flatHome = payload?.injuries?.home;
    const flatAway = payload?.injuries?.away;

    // Old/raw shape
    const rawHome = payload?.home?.response;
    const rawAway = payload?.away?.response;

    const home = Array.isArray(flatHome) ? flatHome : Array.isArray(rawHome) ? rawHome : [];
    const away = Array.isArray(flatAway) ? flatAway : Array.isArray(rawAway) ? rawAway : [];

    const pickTeamName = (sideArr, fallback) =>
      sideArr?.[0]?.team?.name || fallback || "";

    return {
      homeList: home,
      awayList: away,
      homeTeamName: pickTeamName(home, payload?.home_team || "Home"),
      awayTeamName: pickTeamName(away, payload?.away_team || "Away"),
    };
  }, [data]);

  if (loading) return <p>Loading injuries...</p>;
  if ((!homeList || homeList.length === 0) && (!awayList || awayList.length === 0)) {
    return <p>No injuries reported.</p>;
  }

  const renderCol = (sideList, header) => (
    <div className={styles.injuryColumn}>
      <h4>{header}</h4>
      {sideList.length ? (
        <ul className={styles.injuryList}>
          {sideList.map((inj, idx) => (
            <li key={idx} className={styles.injuryItem}>
              {inj?.player?.photo ? (
                <img
                  src={inj.player.photo}
                  alt={inj.player.name || "Player"}
                  className={styles.injuryPlayerPhoto}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : null}
              <div>
                <b>{inj?.player?.name || "Unknown player"}</b>
                <div className={styles.injuryReason}>
                  {inj?.player?.type ? `${inj.player.type}` : ""}
                  {inj?.player?.reason ? ` — ${inj.player.reason}` : ""}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No injuries.</p>
      )}
    </div>
  );

  return (
    <div className={styles.tabContent}>
      <h3>Injuries</h3>
      <div className={styles.injuriesContainer}>
        {renderCol(homeList, homeTeamName)}
        {renderCol(awayList, awayTeamName)}
      </div>
    </div>
  );
};

export default InjuriesSection;