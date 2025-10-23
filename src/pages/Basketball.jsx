// src/pages/Basketball.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = process.env.REACT_APP_API_BASE || "https://logies-edges-api.onrender.com";

export default function Basketball() {
  const [games, setGames] = useState([]);
  const [daysAhead, setDaysAhead] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchGames = () => {
    setLoading(true);
    setError("");

    fetch(`${API_BASE}/api/fixtures/all`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((rows) => {
        const now = new Date();
        const cutoff = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

        const isNBA = (f) => {
          const sport = (f.sport || "").toLowerCase();
          const comp = (f.comp || "").toLowerCase();
          return sport === "nba" || comp === "nba" || comp.includes("nba") || comp === "standard";
        };

        const inWindow = (f) => {
          if (!f.kickoff_utc) return false;
          const d = new Date(f.kickoff_utc.endsWith("Z") ? f.kickoff_utc : f.kickoff_utc + "Z");
          return d >= now && d <= cutoff;
        };

        const out = (rows || []).filter((f) => isNBA(f) && inWindow(f));
        setGames(out);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysAhead]);

  const formatTimeUTC = (isoString) => {
    if (!isoString) return "—";
    const safe = isoString.endsWith("Z") ? isoString : isoString + "Z";
    try {
      const d = new Date(safe);
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });
    } catch {
      return isoString.slice(11, 16);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Basketball (NBA) — Upcoming</h2>

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
        <span style={{ marginLeft: 8, color: "#666" }}>(Click a row to open the game page)</span>
      </div>

      {error && <p style={{ color: "#c00" }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : games.length === 0 ? (
        <p>No NBA games found in the selected window.</p>
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
                onClick={() => navigate(`/basketball/game/${g.id}`)}
              >
                <td>{formatTimeUTC(g.kickoff_utc)}</td>
                <td>
                  <strong>{g.home_team}</strong> vs {g.away_team}
                </td>
                <td>{g.comp || "NBA"}</td>
                <td align="right">
                  {g.best_home ? `${g.best_home.price} (${g.best_home.bookmaker})` : "—"}
                </td>
                <td align="right">
                  {g.best_away ? `${g.best_away.price} (${g.best_away.bookmaker})` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}