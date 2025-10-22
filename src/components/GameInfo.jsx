import React, { useEffect, useState } from "react";
import axios from "axios";

const GameInfo = ({ fixtureId, market }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!fixtureId || !market) return;

    const fetchExplanation = async () => {
      try {
        const res = await axios.get("/api/explain/probability", {
          params: { fixture_id: fixtureId, market },
        });
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch explanation", err);
      }
    };

    fetchExplanation();
  }, [fixtureId, market]);

  if (!data) return <div className="game-info">Loading explanation...</div>;

  return (
    <div className="game-info">
      <h3>📊 Model Insight</h3>
      <p><strong>Market:</strong> {data.market}</p>
      {data.model_probability && (
        <p><strong>Probability:</strong> {data.model_probability}%</p>
      )}
      {data.fair_price && (
        <p><strong>Fair Price:</strong> {data.fair_price}</p>
      )}
      {data.confidence && (
        <p><strong>Confidence:</strong> {data.confidence}</p>
      )}
      <hr />
      <ul>
        {data.notes.map((note, idx) => (
          <li key={idx}>{note}</li>
        ))}
      </ul>
      {data.recommendation && (
        <p><em>{data.recommendation}</em></p>
      )}
    </div>
  );
};

export default GameInfo;