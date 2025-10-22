import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function FootballGames() {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    setErr("");

    fetch("http://127.0.0.1:8000/api/fixtures/all")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(rows => {
        const out = (rows || []).filter(f => {
          const sport = (f.sport || "").toLowerCase();
          const comp  = (f.comp || "").toLowerCase();

          // ✅ Only include football (soccer) fixtures
          const isFootballSport = sport === "football" || sport === "soccer";
          const isFootballLeague = !(
            comp.includes("nfl") ||
            comp.includes("ncaa") ||
            comp.includes("nba") ||
            comp.includes("nhl") ||
            comp.includes("basket") ||
            comp.includes("hockey") ||
            comp.includes("american")
          );

          return isFootballSport || isFootballLeague;
        });

        setFixtures(out);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  const timeUTC = (iso) => {
    if (!iso) return "—";
    const s = iso.endsWith("Z") ? iso : iso + "Z";
    try {
      const d = new Date(s);
      return d.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      });
    } catch {
      return iso.slice(11, 16);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Football (Soccer) — Upcoming</h2>

      {err && <p style={{ color: "#c00" }}>{err}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : fixtures.length === 0 ? (
        <p>No upcoming football fixtures found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Time (UTC)</th>
              <th align="left">Matchup</th>
              <th align="left">Competition</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map(f => (
              <tr key={f.id}>
                <td>{timeUTC(f.kickoff_utc)}</td>
                <td>
                  <Link to={`/fixture/${f.id}`}>
                    {f.home_team} vs {f.away_team}
                  </Link>
                </td>
                <td>{f.comp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}