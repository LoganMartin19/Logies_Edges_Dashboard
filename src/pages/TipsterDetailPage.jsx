import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchTipster, fetchTipsterPicks, fetchMyTipster } from "../api";
import { useAuth } from "../components/AuthGate";

const TipsterDetailPage = () => {
  const { username } = useParams();
  const { user } = useAuth();

  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);
  const [myTipster, setMyTipster] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    setErr("");
    fetchTipster(username).then(setTipster).catch((e) => setErr(e?.message || "Not found"));
    fetchTipsterPicks(username).then(setPicks).catch(console.error);

    // If logged in, ask the API which tipster (if any) belongs to me
    if (user) {
      fetchMyTipster().then(setMyTipster).catch(() => setMyTipster(null));
    } else {
      setMyTipster(null);
    }
  }, [username, user]);

  const isOwner = useMemo(
    () => !!myTipster && myTipster.username === username,
    [myTipster, username]
  );

  if (err && !tipster) return <div style={{ padding: 16 }}>Tipster not found.</div>;
  if (!tipster) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div className="page">
      <Link to="/tipsters">← Back</Link>

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
            <span>ROI: {(tipster.roi_30d || 0).toFixed(2)}%</span>
            <span>Profit: {(tipster.profit_30d || 0).toFixed(2)}</span>
            <span>Winrate: {(tipster.winrate_30d || 0).toFixed(2)}%</span>
          </div>

          {isOwner && (
            <Link
              to={`/tipsters/${encodeURIComponent(username)}/new-pick`}
              className="btn"
              style={{ marginTop: 10, display: "inline-block" }}
            >
              + Add Pick
            </Link>
          )}
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
              <td>{p.price?.toFixed(2)}</td>
              <td>{p.stake?.toFixed(2)}</td>
              <td>{p.result || "—"}</td>
              <td style={{ color: (p.profit || 0) >= 0 ? "lightgreen" : "salmon" }}>
                {p.profit?.toFixed(2)}
              </td>
            </tr>
          ))}
          {picks.length === 0 && (
            <tr>
              <td colSpan={6} style={{ opacity: 0.7, padding: 12 }}>
                No picks yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style jsx="true">{`
        .profile { display: flex; gap: 16px; align-items: center; margin: 16px 0 20px; }
        .avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; }
        .metrics { display: flex; gap: 12px; font-size: 0.9rem; margin-top: 8px; opacity: 0.9; }
        .btn { background:#2e7d32; color:#fff; padding:6px 10px; border-radius:6px; text-decoration:none; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid rgba(255,255,255,0.1); padding: 8px; }
        th { text-align: left; background: rgba(255,255,255,0.04); }
      `}</style>
    </div>
  );
};

export default TipsterDetailPage;