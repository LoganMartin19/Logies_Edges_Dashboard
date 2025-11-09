import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "../styles/Tennis.module.css";

const pct = (p) => (p || p === 0 ? `${(p * 100).toFixed(1)}%` : "—");

export default function TennisMatch() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`http://127.0.0.1:8000/tennis/match/${id}`);
        const j = await r.json();
        if (!alive) return;
        setData(j || {});
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [id]);

  if (loading) return <div className={styles.page}><div className={styles.card}>Loading…</div></div>;
  if (!data) return <div className={styles.page}><div className={styles.card}>Not found.</div></div>;

  return (
    <div className={styles.page}>
      <Link className={styles.link} to="/tennis">← Back</Link>
      <div className={styles.card} style={{marginTop:10}}>
        <div className={styles.cardHeader}>
          {data.player_a} vs {data.player_b} &nbsp; <span className={styles.badge}>{data.tour || "—"}</span>
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>Moneyline</div>
            <table className={styles.table}>
              <thead><tr><th>Side</th><th className={styles.num}>Odds</th><th className={styles.num}>Prob</th><th className={styles.num}>Edge</th></tr></thead>
              <tbody>
                <tr>
                  <td>{data.player_a}</td>
                  <td className={styles.num}>{data.odds_a ?? "—"}</td>
                  <td className={styles.num}>{pct(data.prob_a)}</td>
                  <td className={styles.num} style={{fontWeight:700, color: (data.edge_a>0?"#0fd28a":"#ff6b6b")}}>
                    {data.edge_a ? `${(data.edge_a*100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
                <tr>
                  <td>{data.player_b}</td>
                  <td className={styles.num}>{data.odds_b ?? "—"}</td>
                  <td className={styles.num}>{pct(data.prob_b)}</td>
                  <td className={styles.num} style={{fontWeight:700, color: (data.edge_b>0?"#0fd28a":"#ff6b6b")}}>
                    {data.edge_b ? `${(data.edge_b*100).toFixed(1)}%` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Surface/Form (stub)</div>
            <div style={{color:"#93a1b4"}}>Hook this up to your tennis API: last 10 on this surface, H2H, holds/breaks.</div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>Books snapshot</div>
            <table className={styles.table}>
              <thead><tr><th>Book</th><th>Side</th><th className={styles.num}>Price</th></tr></thead>
              <tbody>
                {(data.books || []).map((r,i)=>(
                  <tr key={i}>
                    <td>{r.bookmaker}</td>
                    <td>{r.side}</td>
                    <td className={styles.num}>{r.price}</td>
                  </tr>
                ))}
                {!(data.books||[]).length && (
                  <tr><td colSpan={3} style={{color:"#93a1b4"}}>No odds rows yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}