// src/components/PlayerGameLog.jsx
import React, { useEffect, useState } from "react";

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : "-";

export default function PlayerGameLog({ fixtureId, playerId, last = 10 }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!fixtureId || !playerId) return;
    (async () => {
      const r = await fetch(
        `http://127.0.0.1:8000/football/player/game-log?fixture_id=${fixtureId}&player_id=${playerId}&last=${last}`
      );
      const j = await r.json();
      setRows(j.games || []);
    })();
  }, [fixtureId, playerId, last]);

  if (!rows) return <div className="card">Loading match log…</div>;
  if (!rows.length) return <div className="card">No recent appearances.</div>;

  return (
    <div className="card">
      <h3>Recent Matches</h3>
      <table className="oddsTable">
        <thead>
          <tr>
            <th>Date</th><th>Opp</th><th>H/A</th><th>Score</th>
            <th>Min</th><th>G</th><th>A</th><th>Sh</th><th>SoT</th>
            <th>YC</th><th>RC</th><th>Rating</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((g, i) => (
            <tr key={i}>
              <td>{fmtDate(g.date)}</td>
              <td>{g.opponent}</td>
              <td style={{textAlign:"center"}}>{g.is_home ? "H" : "A"}</td>
              <td style={{textAlign:"center"}}>{g.score || "-"}</td>
              <td style={{textAlign:"right"}}>{g.minutes}</td>
              <td style={{textAlign:"right"}}>{g.goals}</td>
              <td style={{textAlign:"right"}}>{g.assists}</td>
              <td style={{textAlign:"right"}}>{g.shots}</td>
              <td style={{textAlign:"right"}}>{g.sot}</td>
              <td style={{textAlign:"right"}}>{g.yellow}</td>
              <td style={{textAlign:"right"}}>{g.red}</td>
              <td style={{textAlign:"right"}}>{g.rating ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}