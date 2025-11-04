import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchTipster, fetchTipsterPicks } from "../api";

const TipsterDetailPage = () => {
  const { username } = useParams();
  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);

  useEffect(() => {
    fetchTipster(username).then(setTipster).catch(console.error);
    fetchTipsterPicks(username).then(setPicks).catch(console.error);
  }, [username]);

  if (!tipster) return <div>Loading...</div>;

  return (
    <div className="page">
      <Link to="/tipsters">← Back</Link>
      <div className="profile">
        <img
          src={tipster.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(tipster.name)}`}
          alt={tipster.name}
          className="avatar"
        />
        <div>
          <h2>{tipster.name} {tipster.is_verified && "✅"}</h2>
          <p>@{tipster.username}</p>
          <p>{tipster.bio}</p>
          <div className="metrics">
            <span>ROI: {tipster.roi_30d?.toFixed(2)}%</span>
            <span>Profit: {tipster.profit_30d?.toFixed(2)}</span>
            <span>Winrate: {tipster.winrate_30d?.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <h3>Recent Picks</h3>
      <table className="picks">
        <thead>
          <tr><th>Market</th><th>Bookmaker</th><th>Odds</th><th>Stake</th><th>Result</th><th>Profit</th></tr>
        </thead>
        <tbody>
          {picks.map((p) => (
            <tr key={p.id}>
              <td>{p.market}</td>
              <td>{p.bookmaker || "—"}</td>
              <td>{p.price?.toFixed(2)}</td>
              <td>{p.stake?.toFixed(2)}</td>
              <td>{p.result || "—"}</td>
              <td style={{ color: p.profit >= 0 ? "green" : "red" }}>
                {p.profit?.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx="true">{`
        .profile { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
        .avatar { width: 80px; height: 80px; border-radius: 50%; }
        .metrics { display: flex; gap: 12px; font-size: 0.9rem; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #ddd; padding: 8px; }
        th { text-align: left; background: #f9f9f9; }
      `}</style>
    </div>
  );
};

export default TipsterDetailPage;