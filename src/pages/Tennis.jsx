import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import styles from "../styles/Tennis.module.css";

const fmtTime = (iso) => {
  try {
    return new Date(iso).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};
const pct = (p) => (p || p === 0 ? `${(p * 100).toFixed(1)}%` : "—");
const edgeFmt = (e) => (Number.isFinite(e) ? `${(e * 100).toFixed(1)}%` : "—");

export default function Tennis() {
  const [sp, setSp] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const date = sp.get("date") || new Date().toISOString().slice(0,10);
  const tour = sp.get("tour") || "ALL"; // ALL | ATP | WTA | CHALL

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`http://127.0.0.1:8000/tennis/matches?date=${date}`);
        const j = await r.json();
        if (!alive) return;
        setRows(Array.isArray(j.matches) ? j.matches : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [date]);

  const filtered = useMemo(() => {
    if (tour === "ALL") return rows;
    return rows.filter(r => (r.tour || "").toUpperCase().includes(tour));
  }, [rows, tour]);

  const setParam = (key, val) => {
    const next = new URLSearchParams(sp);
    next.set(key, val);
    setSp(next, { replace:true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.h1}>Tennis — Today</h1>
        <input
          className={styles.inp}
          type="date"
          value={date}
          onChange={(e) => setParam("date", e.target.value)}
        />
        <div className={styles.filters}>
          {["ALL","ATP","WTA","CHALL"].map(k => (
            <button
              key={k}
              onClick={() => setParam("tour", k)}
              className={`${styles.btn} ${tour === k ? "active "+styles.btn : ""}`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>Matches & Edges</div>
          {loading ? <div className={styles.badge}>Loading…</div> : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Tour</th>
                  <th>Match</th>
                  <th className={styles.num}>A Odds</th>
                  <th className={styles.num}>B Odds</th>
                  <th className={styles.num}>P(A)</th>
                  <th className={styles.num}>P(B)</th>
                  <th className={styles.num}>Edge (best)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.fixture_id}>
                    <td>{fmtTime(m.kickoff_utc)}</td>
                    <td><span className={styles.badge}>{m.tour || "—"}</span></td>
                    <td>
                      <Link className="link" to={`/tennis/match/${m.fixture_id}`}>
                        <span className={styles.link}>{m.player_a} vs {m.player_b}</span>
                      </Link>
                    </td>
                    <td className={styles.num}>{m.odds_a ?? "—"}</td>
                    <td className={styles.num}>{m.odds_b ?? "—"}</td>
                    <td className={styles.num}>{pct(m.prob_a)}</td>
                    <td className={styles.num}>{pct(m.prob_b)}</td>
                    <td className={styles.num}>
                      <span className={m.edge_best && m.edge_best > 0 ? styles.edgeGood : styles.edgeBad}>
                        {edgeFmt(m.edge_best)}
                      </span>
                    </td>
                  </tr>
                ))}
                {!filtered.length && !loading && (
                  <tr><td colSpan={8} style={{color:"#93a1b4"}}>No matches for these filters.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}