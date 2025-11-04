import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchCreators } from "../api";

const CreatorsPage = () => {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCreators()
      .then(setCreators)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading creators...</div>;

  return (
    <div className="page">
      <h1>Top Creators</h1>
      <p className="sub">Independent tipsters ranked by ROI (30d).</p>

      <div className="creator-grid">
        {creators.map((c) => (
          <Link to={`/creator/${c.username}`} key={c.id} className="creator-card">
            <img
              src={c.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`}
              alt={c.name}
              className="avatar"
            />
            <div className="info">
              <h3>{c.name} {c.is_verified && "✅"}</h3>
              <p>@{c.username}</p>
              <p>{c.bio || "No bio yet"}</p>
              <div className="metrics">
                <span>ROI: {c.roi_30d?.toFixed(2)}%</span>
                <span>Winrate: {c.winrate_30d?.toFixed(1)}%</span>
                <span>Profit: {c.profit_30d?.toFixed(2)}</span>
                <span>Picks: {c.picks_30d || 0}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style jsx="true">{`
        .creator-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          margin-top: 16px;
        }
        .creator-card {
          border: 1px solid #eee;
          border-radius: 10px;
          padding: 16px;
          display: flex;
          text-decoration: none;
          color: inherit;
          background: white;
        }
        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          margin-right: 12px;
        }
        .metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.8rem;
          margin-top: 8px;
        }
        .sub {
          color: gray;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default CreatorsPage;