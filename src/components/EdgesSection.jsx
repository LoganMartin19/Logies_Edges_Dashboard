// src/components/EdgesSection.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api"; // ✅ uses env-based axios instance

const EdgesSection = ({ fixtureId }) => {
  const [edges, setEdges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fixtureId) return;
    setLoading(true);
    setError("");

    api
      .get("/edges", { params: { fixture_id: fixtureId } })
      .then((res) => setEdges(res.data || []))
      .catch((err) => {
        console.error("Edges fetch failed:", err);
        setError("Failed to load edges");
        setEdges([]);
      })
      .finally(() => setLoading(false));
  }, [fixtureId]);

  return (
    <div className="card">
      <h3>Edges</h3>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "#c00" }}>{error}</p>}

      {!loading && !edges.length && !error && (
        <p style={{ color: "#666" }}>No edges available.</p>
      )}

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