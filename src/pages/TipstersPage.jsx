// src/pages/TipstersPage.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTipsters } from "../api";

const tone = (v = 0) => (v > 0 ? "good" : v < 0 ? "bad" : "muted");

const TipstersPage = () => {
  const [Tipsters, setTipsters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTipsters()
      .then(setTipsters)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 16, color: "#eaf4ed" }}>Loading Tipsters...</div>;

  return (
    <div className="page">
      <h1>Top Tipsters</h1>
      <p className="sub">Independent tipsters ranked by ROI (30d).</p>

      <div className="tipster-grid">
        {Tipsters.map((c) => (
          <Link to={`/tipsters/${c.username}`} key={c.id} className="tipster-card">
            <img
              src={
                c.avatar_url ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name || c.username || "U")}`
              }
              alt={c.name || c.username}
              className="avatar"
            />
            <div className="info">
              <h3>
                {c.name || c.username} {c.is_verified && "✅"}
              </h3>
              <p className="handle">@{c.username}</p>
              <p className="bio">{c.bio || "No bio yet"}</p>
              <div className="metrics">
                <span className={`pill ${tone(c.roi_30d)}`}>ROI: {(c.roi_30d ?? 0).toFixed(2)}%</span>
                <span className="pill">Winrate: {(c.winrate_30d ?? 0).toFixed(1)}%</span>
                <span className="pill">Profit: {(c.profit_30d ?? 0).toFixed(2)}</span>
                <span className="pill">Picks: {c.picks_30d ?? 0}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <style jsx="true">{`
        .page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 16px;
          color: #eaf4ed;
        }
        h1 {
          margin: 0 0 6px 0;
        }
        .sub {
          color: rgba(255, 255, 255, 0.75);
          margin-bottom: 20px;
        }

        .tipster-grid {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          margin-top: 16px;
        }

        .tipster-card {
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: #111;
          color: #eaf4ed;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          text-decoration: none;
          transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
        }
        .tipster-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
        }

        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          margin-right: 12px;
          background: #0b1e13;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .info h3 {
          margin: 0 0 2px 0;
          font-weight: 700;
        }
        .handle {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.9rem;
        }
        .bio {
          margin: 6px 0 8px 0;
          color: rgba(255, 255, 255, 0.85);
        }

        .metrics {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 0.82rem;
          margin-top: 6px;
        }
        .pill {
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }
        .pill.good {
          border-color: rgba(15, 88, 40, 0.6);
          background: rgba(15, 88, 40, 0.18);
          color: #b5ffd0;
        }
        .pill.bad {
          border-color: rgba(198, 40, 40, 0.6);
          background: rgba(198, 40, 40, 0.16);
          color: #ffc6c6;
        }
        .pill.muted {
          color: #eaf4ed;
        }
      `}</style>
    </div>
  );
};

export default TipstersPage;