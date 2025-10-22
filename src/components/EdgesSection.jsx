import React, { useEffect, useState } from "react";

const EdgesSection = ({ fixtureId }) => {
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/edges?fixture_id=${fixtureId}`)
      .then((res) => res.json())
      .then(setEdges)
      .catch((err) => console.error("Edges fetch failed:", err));
  }, [fixtureId]);

  return (
    <div className="card">
      <h3>Edges</h3>
      {edges.map((edge, i) => (
        <div key={i} className="edge-row">
          <span>{edge.market}</span>
          <span>{edge.model_prob}%</span>
          <span>{edge.edge_percent}%</span>
        </div>
      ))}
    </div>
  );
};

export default EdgesSection;