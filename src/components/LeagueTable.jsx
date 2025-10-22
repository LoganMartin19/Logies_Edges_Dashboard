// src/components/LeagueTable.jsx
import React, { useEffect, useState } from "react";
import styles from "../styles/LeagueTable.module.css";

export default function LeagueTable({ league, homeTeam, awayTeam }) {
  const [table, setTable] = useState([]);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/admin/refresh-standings?league=${league}`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.table)) {
          setTable(json.table);
        } else {
          setTable([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch standings:", err);
        setTable([]);
      });
  }, [league]);

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
            const isHighlighted =
              row.team === homeTeam || row.team === awayTeam;

            return (
              <tr
                key={row.team}
                className={isHighlighted ? styles.highlightRow : ""}
              >
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