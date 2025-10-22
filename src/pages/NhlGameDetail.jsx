// src/pages/NhlGameDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

export default function NhlGameDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    setData(null);

    const url = `http://127.0.0.1:8000/api/fixtures/id/${id}/json`;
    // console.log("Fetching NHL detail:", url);
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        // console.log("Detail response:", json);
        setData(json);
      })
      .catch(e => {
        console.error(e);
        setErr(e.message);
      });
  }, [id]);

  const groupedOdds = useMemo(() => {
    const byBook = {};
    const rows = data?.odds || [];
    for (const o of rows) {
      const book = (o.bookmaker || "other").toLowerCase();
      if (!byBook[book]) byBook[book] = [];
      byBook[book].push(o);
    }
    for (const b of Object.keys(byBook)) {
      byBook[b].sort(
        (a, b) =>
          (a.market || "").localeCompare(b.market || "") ||
          (b.last_seen || "").localeCompare(a.last_seen || "")
      );
    }
    return byBook;
  }, [data]);

  const formatUTC = (iso) => {
    if (!iso) return "—";
    const safe = iso.endsWith("Z") ? iso : iso + "Z";
    try {
      return new Date(safe).toLocaleString("en-GB", {
        timeZone: "UTC",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  if (err) return <div style={{ padding: 16 }}><p style={{ color: "#c00" }}>{err}</p></div>;
  if (!data) return <div style={{ padding: 16 }}><p>Loading…</p></div>;
  if (!data.fixture) return <div style={{ padding: 16 }}><p>No fixture data found.</p></div>;

  const f = data.fixture;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <Link to="/nhl">← Back to NHL Games</Link>
      </div>

      <h2>{f.home_team} vs {f.away_team}</h2>
      <div style={{ color: "#666", marginBottom: 16 }}>
        {f.comp || "NHL"} • {formatUTC(f.kickoff_utc)} UTC
      </div>

      <h3>Best Edges</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18 }}>
        <thead>
          <tr>
            <th align="left">Market</th>
            <th align="right">Odds</th>
            <th align="right">Edge</th>
            <th align="left">Bookmaker</th>
          </tr>
        </thead>
        <tbody>
          {(data.best_edges || []).map((e, i) => (
            <tr key={i}>
              <td>{e.market}</td>
              <td align="right">{Number(e.price).toFixed(2)}</td>
              <td align="right">{(Number(e.edge) * 100).toFixed(1)}%</td>
              <td>{e.bookmaker}</td>
            </tr>
          ))}
          {(!data.best_edges || data.best_edges.length === 0) && (
            <tr><td colSpan={4} style={{ color: "#666" }}>No edges yet.</td></tr>
          )}
        </tbody>
      </table>

      <h3>All Odds</h3>
      {Object.keys(groupedOdds).length === 0 ? (
        <p style={{ color: "#666" }}>No odds captured yet.</p>
      ) : (
        Object.entries(groupedOdds).map(([book, rows]) => (
          <div key={book} style={{ marginBottom: 22 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{book}</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th align="left">Market</th>
                  <th align="right">Price</th>
                  <th align="left">Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o, idx) => {
                  const seen = o.last_seen ? (o.last_seen.endsWith("Z") ? o.last_seen : o.last_seen + "Z") : "";
                  return (
                    <tr key={`${book}-${idx}`}>
                      <td>{o.market}</td>
                      <td align="right">{Number(o.price).toFixed(2)}</td>
                      <td>{seen ? new Date(seen).toLocaleString("en-GB") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}