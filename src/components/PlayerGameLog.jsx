// src/components/PlayerGameLog.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api"; // ✅ env-based axios client

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" }) : "-";

export default function PlayerGameLog({ fixtureId, playerId, last = 10 }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!fixtureId || !playerId) return;
    let alive = true;

    (async () => {
      try {
        const { data } = await api.get("/football/player/game-log", {
          params: { fixture_id: fixtureId, player_id: playerId, last },
        });
        if (!alive) return;
        setRows(data?.games || []);
        setErr("");
      } catch (e) {
        if (!alive) return;
        console.error("player game-log fetch failed:", e);
        setErr("Failed to load recent matches.");
        setRows([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [fixtureId, playerId, last]);

  if (rows === null) return <div className="card">Loading match log…</div>;
  if (err) return <div className="card" style={{ color: "#c00" }}>{err}</div>;
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