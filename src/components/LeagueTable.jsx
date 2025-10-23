// src/components/LeagueTable.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api"; // ✅ env-based axios client
import styles from "../styles/LeagueTable.module.css";

export default function LeagueTable({ league, homeTeam, awayTeam }) {
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!league) return;
    setLoading(true);
    setErr("");

    api
      .get("/api/fixtures/league/table", { params: { league } }) // ✅ public/read endpoint
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.table;
        setTable(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("Failed to fetch standings:", e);
        setErr("Failed to fetch standings.");
        setTable([]);
      })
      .finally(() => setLoading(false));
  }, [league]);

  if (loading) return <p className={styles.empty}>Loading table…</p>;
  if (err) return <p className={styles.empty} style={{ color: "#c00" }}>{err}</p>;
  if (!table.length) return <p className={styles.empty}>No table available.</p>;

  return (
    <div className={styles.card}>
      <h3 className={styles.heading}>{league} Standings</h3>
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
            const isHighlighted = row.team === homeTeam || row.team === awayTeam;
            return (
              <tr key={row.team} className={isHighlighted ? styles.highlightRow : ""}>
                <td>{row.position}</td>
                <td>{row.team}</td>
                <td>{row.played}</td>
                <td>{row.win}</td>
                <td>{row.draw}</td>
                <td>{row.lose}</td>
                <td>{row.gf}</td>
                <td>{row.ga}</td>
                <td>{row.gf - row.ga}</td>
                <td>{row.points}</td>
                <td>{row.form || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}