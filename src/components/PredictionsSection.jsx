// src/components/PredictionsSection.jsx
import React, { useEffect, useState } from "react";
import styles from "../styles/FixturePage.module.css";

const PredictionsSection = ({ fixtureId }) => {
  const [pred, setPred] = useState(null);

  useEffect(() => {
    const fetchPred = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/football/predictions?fixture_id=${fixtureId}`
        );
        const json = await res.json();
        setPred(json?.data?.response?.[0] || null); // ✅ FIXED
      } catch (err) {
        console.error("Error fetching predictions:", err);
      }
    };
    fetchPred();
  }, [fixtureId]);

  if (!pred) return <p>No predictions available.</p>;

  return (
    <div className={styles.tabContent}>
      <h3>Predictions <small>(via API-Football)</small></h3>
      <p>
        <b>Advice:</b> {pred.predictions?.advice || "N/A"}
      </p>
      <p>
        <b>Win %:</b> Home {pred.predictions?.percent?.home}, Draw{" "}
        {pred.predictions?.percent?.draw}, Away{" "}
        {pred.predictions?.percent?.away}
      </p>
      {pred.predictions?.winner && (
        <p>
          <b>Likely Winner:</b> {pred.predictions.winner.name} (
          {pred.predictions.winner.comment || "no comment"})
        </p>
      )}
      <small className={styles.disclaimer}>
        Note: Predictions are based on API-Football, not our model
      </small>
    </div>
  );
};

export default PredictionsSection;