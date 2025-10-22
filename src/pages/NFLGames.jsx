// src/pages/NflGames.jsx
import React, { useEffect, useState } from "react";

export default function NflGames() {
  const [games, setGames] = useState([]);
  const [day, setDay] = useState(new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/nfl/games?day=${day}`)
      .then(r => r.json())
      .then(j => setGames(j.games || []))
      .finally(() => setLoading(false));
  }, [day]);

  return (
    <div style={{ padding: 16 }}>
      <h2>NFL Fixtures — {day}</h2>
      <input
        type="date"
        value={day}
        onChange={e => setDay(e.target.value)}
        style={{ marginBottom: 12 }}
      />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <th align="left">Time</th>
              <th align="left">Matchup</th>
              <th align="center">Score</th>
              <th align="left">Status</th>
              <th align="right">Odds</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.provider_fixture_id}>
                <td>{g.kickoff_utc?.slice(11,16) || "—"}</td>
                <td>{g.home_team} vs {g.away_team}</td>
                <td align="center">{g.home_score ?? "—"}–{g.away_score ?? "—"}</td>
                <td>{g.status || "—"}</td>
                <td align="right">
                  <a href={`#/nfl/odds?fixture_id=${g.id}`}>view</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}