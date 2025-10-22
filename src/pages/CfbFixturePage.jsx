import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function CfbFixturePage() {
  const { id } = useParams();
  const [fixture, setFixture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`http://127.0.0.1:8000/api/fixtures/id/${id}/json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setFixture(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (error) return <div style={{ color: "red", padding: 16 }}>Error: {error}</div>;
  if (!fixture || !fixture.fixture) return <div style={{ padding: 16 }}>Fixture not found.</div>;

  const f = fixture.fixture;
  const odds = fixture.odds || [];
  const bestEdges = fixture.best_edges || [];

  const groupByBookmaker = (oddsList) => {
    const grouped = {};
    for (const o of oddsList) {
      const book = o.bookmaker || "unknown";
      if (!grouped[book]) grouped[book] = [];
      grouped[book].push(o);
    }
    return grouped;
  };

  const groupedOdds = groupByBookmaker(odds);

  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toUTCString().replace("GMT", "UTC");
    } catch {
      return iso;
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Link to="/cfb" style={{ textDecoration: "none", color: "#0077cc" }}>
        ← Back to CFB Games
      </Link>

      <h2 style={{ marginTop: 10 }}>
        {f.home_team} vs {f.away_team}
      </h2>
      <div style={{ marginBottom: 8, color: "#666" }}>
        {f.comp} • {formatDate(f.kickoff_utc)}
      </div>

      {/* Best edges (model output) */}
      {bestEdges.length > 0 && (
        <>
          <h3>Best Edges</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #ccc" }}>
                <th align="left">Market</th>
                <th align="right">Odds</th>
                <th align="right">Edge</th>
                <th align="left">Bookmaker</th>
              </tr>
            </thead>
            <tbody>
              {bestEdges.map((e, i) => (
                <tr key={i}>
                  <td>{e.market}</td>
                  <td align="right">{e.price ? e.price.toFixed(2) : "—"}</td>
                  <td align="right" style={{ color: e.edge > 0 ? "green" : "#999" }}>
                    {(e.edge * 100).toFixed(1)}%
                  </td>
                  <td>{e.bookmaker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Odds grouped by bookmaker */}
      <h3>All Odds</h3>
      {Object.entries(groupedOdds).length === 0 ? (
        <p>No odds available.</p>
      ) : (
        Object.entries(groupedOdds).map(([book, list]) => (
          <div key={book} style={{ marginBottom: 24 }}>
            <h4 style={{ marginBottom: 4 }}>{book}</h4>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #ccc" }}>
                  <th align="left">Market</th>
                  <th align="right">Price</th>
                  <th align="left">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o, i) => (
                  <tr key={i}>
                    <td>{o.market}</td>
                    <td align="right">{o.price.toFixed(2)}</td>
                    <td>{new Date(o.last_seen).toLocaleString("en-GB", { timeZone: "UTC" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}