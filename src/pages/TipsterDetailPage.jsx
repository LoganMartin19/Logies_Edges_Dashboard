import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { fetchTipster, fetchTipsterPicks } from "../api";
import { useAuth } from "../components/AuthGate";

const TipsterDetailPage = () => {
  const { username } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);

  useEffect(() => {
    fetchTipster(username).then(setTipster).catch(console.error);
    fetchTipsterPicks(username).then(setPicks).catch(console.error);
  }, [username]);

  // Determine ownership:
  // Prefer a dedicated owner email field if your API returns it (e.g., owner_email),
  // otherwise fall back to social_links.email if present.
  const tipsterEmail = useMemo(() => {
    if (!tipster) return "";
    const fromOwner = tipster.owner_email || tipster.ownerEmail; // support either casing
    const fromSocial = tipster.social_links?.email || tipster.socialLinks?.email;
    return (fromOwner || fromSocial || "").toLowerCase();
  }, [tipster]);

  const isOwner = useMemo(() => {
    const u = (user?.email || "").toLowerCase();
    return !!u && !!tipsterEmail && u === tipsterEmail;
  }, [user, tipsterEmail]);

  if (!tipster) return <div>Loading...</div>;

  return (
    <div className="page">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <Link to="/tipsters">← Back</Link>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {isOwner && (
            <button
              onClick={() => nav(`/tipster/${encodeURIComponent(username)}/new-pick`)}
              style={{
                padding: "8px 12px",
                background: "#0f5828",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              + Add Pick
            </button>
          )}
        </div>
      </div>

      <div className="profile">
        <img
          src={
            tipster.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              tipster.name || tipster.username
            )}`
          }
          alt={tipster.name}
          className="avatar"
        />
        <div>
          <h2>
            {tipster.name} {tipster.is_verified && "✅"}
          </h2>
          <p>@{tipster.username}</p>
          {tipster.bio && <p>{tipster.bio}</p>}
          <div className="metrics">
            <span>ROI: {(tipster.roi_30d ?? 0).toFixed(2)}%</span>
            <span>Profit: {(tipster.profit_30d ?? 0).toFixed(2)}</span>
            <span>Winrate: {(tipster.winrate_30d ?? 0).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <h3>Recent Picks</h3>
      <table className="picks">
        <thead>
          <tr>
            <th>Market</th>
            <th>Bookmaker</th>
            <th>Odds</th>
            <th>Stake</th>
            <th>Result</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody>
          {picks.map((p) => (
            <tr key={p.id}>
              <td>{p.market}</td>
              <td>{p.bookmaker || "—"}</td>
              <td>{p.price?.toFixed?.(2) ?? Number(p.price).toFixed(2)}</td>
              <td>{p.stake?.toFixed?.(2) ?? Number(p.stake).toFixed(2)}</td>
              <td>{p.result || "—"}</td>
              <td style={{ color: (p.profit ?? 0) >= 0 ? "green" : "red" }}>
                {p.profit?.toFixed?.(2) ?? Number(p.profit || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx="true">{`
        .profile {
          display: flex;
          gap: 16px;
          align-items: center;
          margin-bottom: 20px;
        }
        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
        }
        .metrics {
          display: flex;
          gap: 12px;
          font-size: 0.9rem;
          margin-top: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th,
        td {
          border-bottom: 1px solid #ddd;
          padding: 8px;
        }
        th {
          text-align: left;
          background: #f9f9f9;
        }
      `}</style>
    </div>
  );
};

export default TipsterDetailPage;