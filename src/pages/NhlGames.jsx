// src/pages/NhlGames.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function NhlGames() {
  const [games, setGames] = useState([]);
  const [daysAhead, setDaysAhead] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchGames = () => {
    setLoading(true);
    setError("");
    fetch(`http://127.0.0.1:8000/api/fixtures/ice/upcoming?sport=nhl&days_ahead=${daysAhead}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => setGames(data.fixtures || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchGames(); }, [daysAhead]);

  const timeUTC = (iso) => {
    if (!iso) return "—";
    const s = iso.endsWith("Z") ? iso : iso + "Z";
    try {
      const d = new Date(s);
      return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
    } catch { return iso.slice(11,16); }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>NHL — Upcoming</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span>Show next</span>
        <input
          type="number"
          min={1}
          max={30}
          value={daysAhead}
          onChange={e => setDaysAhead(parseInt(e.target.value || "7", 10))}
          style={{ width: 60 }}
        />
        <span>days</span>
        <button onClick={fetchGames}>Refresh</button>
      </div>

      {error && <p style={{ color: "#c00" }}>{error}</p>}

      {loading ? (
        <p>Loading...</p>
      ) : games.length === 0 ? (
        <p>No NHL games found in the selected window.</p>
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
            {games.map(g => (
              <tr
                key={g.id}
                onClick={() => navigate(`/nhl/game/${g.id}`)}
                style={{ cursor: "pointer" }}
              >
                <td>{timeUTC(g.kickoff_utc)}</td>
                <td>
                  <Link to={`/nhl/game/${g.id}`} onClick={(e) => e.stopPropagation()}>
                    {g.home_team} vs {g.away_team}
                  </Link>
                </td>
                <td>{g.comp || "NHL"}</td>
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