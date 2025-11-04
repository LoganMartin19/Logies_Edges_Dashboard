import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchCreator, fetchCreatorPicks } from "../api";

const CreatorDetailPage = () => {
  const { username } = useParams();
  const [creator, setCreator] = useState(null);
  const [picks, setPicks] = useState([]);

  useEffect(() => {
    fetchCreator(username).then(setCreator).catch(console.error);
    fetchCreatorPicks(username).then(setPicks).catch(console.error);
  }, [username]);

  if (!creator) return <div>Loading...</div>;

  return (
    <div className="page">
      <Link to="/creators">← Back</Link>
      <div className="profile">
        <img
          src={creator.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(creator.name)}`}
          alt={creator.name}
          className="avatar"
        />
        <div>
          <h2>{creator.name} {creator.is_verified && "✅"}</h2>
          <p>@{creator.username}</p>
          <p>{creator.bio}</p>
          <div className="metrics">
            <span>ROI: {creator.roi_30d?.toFixed(2)}%</span>
            <span>Profit: {creator.profit_30d?.toFixed(2)}</span>
            <span>Winrate: {creator.winrate_30d?.toFixed(2)}%</span>
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

export default CreatorDetailPage;