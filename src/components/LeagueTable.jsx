// src/components/LeagueTable.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api"; // env-based axios client
import styles from "../styles/LeagueTable.module.css";

function normalizeName(name = "") {
  return String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")          // strip accents
    .replace(/[^a-z0-9\s]/g, "")              // remove punctuation
    .replace(
      /\b(fc|sc|cf|afc|cfr|calcio|club|de|atletico|internazionale|sporting|munchen|glimt|bodo|bodø)\b/g,
      ""
    )
    .replace(/\s+/g, "")
    .trim();
}

export default function LeagueTable({ league, homeTeam, awayTeam }) {
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!league) return;
    let alive = true;
    setLoading(true);
    setErr("");

    (async () => {
      try {
        const res = await api.get("/api/fixtures/league/table", { params: { league } });
        const data = Array.isArray(res.data) ? res.data : res.data?.table;
        if (!alive) return;
        setTable(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to fetch standings:", e);
        if (!alive) return;
        setErr("Failed to fetch standings.");
        setTable([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [league]);

  if (loading) return <p className={styles.empty}>Loading table…</p>;
  if (err) return <p className={styles.empty} style={{ color: "#c00" }}>{err}</p>;
  if (!table.length) return <p className={styles.empty}>No table available.</p>;

  const normHome = normalizeName(homeTeam);
  const normAway = normalizeName(awayTeam);

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>{league} Standings</h3>

      {/* make wide tables scroll inside, not the whole page */}
      <div className="scrollX">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>D</th>
              <th>L</th>
              <th>GF</th>
              <th>GA</th>
              <th>GD</th>
              <th>Pts</th>
              <th>Form</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => {
              const isHighlighted =
                normalizeName(row.team) === normHome || normalizeName(row.team) === normAway;

              return (
                <tr key={`${row.position}-${row.team}`} className={isHighlighted ? styles.highlightRow : ""}>
                  <td>{row.position}</td>
                  <td className={styles.teamCell}>
                    {row.team}
                    {normalizeName(row.team) === normHome && <span title="Home team"> 🏠</span>}
                    {normalizeName(row.team) === normAway && <span title="Away team"> 🛫</span>}
                  </td>
                  <td>{row.played}</td>
                  <td>{row.win}</td>
                  <td>{row.draw}</td>
                  <td>{row.lose}</td>
                  <td>{row.gf}</td>
                  <td>{row.ga}</td>
                  <td>{row.gf - row.ga}</td>
                  <td>{row.points}</td>
                  <td className="nowrap">{row.form || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}