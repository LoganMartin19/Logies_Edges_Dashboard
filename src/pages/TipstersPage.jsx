import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTipsters } from "../api";

const TipstersPage = () => {
  const [Tipsters, setTipsters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTipsters()
      .then(setTipsters)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading Tipsters...</div>;

  return (
    <div className="page">
      <h1>Top Tipsters</h1>
      <p className="sub">Independent tipsters ranked by ROI (30d).</p>

      <div className="tipster-grid">
        {Tipsters.map((c) => (
          <Link to={`/tipster/${c.username}`} key={c.id} className="tipster-card">
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
        .tipster-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          margin-top: 16px;
        }
        .tipster-card {
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

export default TipstersPage;