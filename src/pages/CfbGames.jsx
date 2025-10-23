// src/pages/CfbGames.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api"; // ✅ env-based axios client

export default function CfbGames() {
  const [games, setGames] = useState([]);
  const [daysAhead, setDaysAhead] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchGames = () => {
    setLoading(true);
    setError("");
    api
      .get("/api/fixtures/gridiron/upcoming", {
        params: { sport: "cfb", days_ahead: daysAhead },
      })
      .then(({ data }) => setGames(data.fixtures || []))
      .catch((e) => setError(e?.message || "Failed to load CFB games"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysAhead]);

  // Helper — render time in UTC (stable across clients)
  const formatTimeUTC = (isoString) => {
    if (!isoString) return "—";
    const safe = isoString.endsWith("Z") || isoString.includes("+") ? isoString : isoString + "Z";
    try {
      const d = new Date(safe);
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });
    } catch {
      return (isoString || "").slice(11, 16);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>College Football (CFB) — Upcoming</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span>Show next</span>
        <input
          type="number"
          min={1}
          max={30}
          value={daysAhead}
          onChange={(e) => setDaysAhead(parseInt(e.target.value || "7", 10))}
          style={{ width: 60 }}
        />
        <span>days</span>
        <button onClick={fetchGames}>Refresh</button>
      </div>

      {error && <p style={{ color: "#c00" }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : games.length === 0 ? (
        <p>No CFB games found in the selected window.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Time (UTC)</th>
              <th align="left">Matchup</th>
              <th align="left">Competition</th>
              <th align="right">Best Home</th>
              <th align="right">Best Away</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr
                key={g.id}
                style={{ cursor: "pointer", borderBottom: "1px solid #ddd" }}
                onClick={() => navigate(`/cfb/fixture/${g.id}`)}
              >
                <td>{formatTimeUTC(g.kickoff_utc)}</td>
                <td><strong>{g.home_team}</strong> vs {g.away_team}</td>
                <td>{g.comp || "NCAA"}</td>
                <td align="right">
                  {g.best_home ? `${Number(g.best_home.price).toFixed(2)} (${g.best_home.bookmaker})` : "—"}
                </td>
                <td align="right">
                  {g.best_away ? `${Number(g.best_away.price).toFixed(2)} (${g.best_away.bookmaker})` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}