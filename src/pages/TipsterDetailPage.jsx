import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchTipster, fetchTipsterPicks } from "../api";
import { settleTipsterPick } from "../api"; // <-- add

const TipsterDetailPage = () => {
  const { username } = useParams();
  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);
  const [settlingId, setSettlingId] = useState(null);

  const load = () => {
    fetchTipster(username).then(setTipster).catch(console.error);
    fetchTipsterPicks(username).then(setPicks).catch(console.error);
  };

  useEffect(() => { load(); }, [username]);

  const onSettle = async (pickId, result) => {
    try {
      setSettlingId(pickId);
      await settleTipsterPick(pickId, result);
      await load(); // refresh list
    } catch (e) {
      alert(e?.response?.data?.detail || e.message || "Failed to settle");
    } finally {
      setSettlingId(null);
    }
  };

  if (!tipster) return <div>Loading...</div>;

  return (
    <div className="page">
      <Link to="/tipsters">← Back</Link>
      {/* ... header block as you already have ... */}

      <h3>Recent Picks</h3>
      <table className="picks">
        <thead>
          <tr>
            <th>Fixture</th><th>Market</th><th>Bookmaker</th>
            <th>Odds</th><th>Stake</th><th>Edge</th><th>Result</th><th>Profit</th>
          </tr>
        </thead>
        <tbody>
          {picks.map((p) => (
            <tr key={p.id}>
              <td>
                {p.fixture_path ? (
                  <Link to={p.fixture_path}>{p.fixture_label || `#${p.fixture_id}`}</Link>
                ) : (p.fixture_label || `#${p.fixture_id}`)}
                {p.sport ? <span style={{ opacity: 0.6, marginLeft: 6 }}>· {p.sport}</span> : null}
              </td>
              <td>{p.market}</td>
              <td>{p.bookmaker || "—"}</td>
              <td>{p.price?.toFixed?.(2) ?? p.price}</td>
              <td>{p.stake?.toFixed?.(2) ?? p.stake}</td>
              <td>{p.model_edge != null ? (p.model_edge * 100).toFixed(1) + "%" : "—"}</td>

              <td>
                {p.result || (tipster.is_owner && (
                  <span>
                    <button
                      disabled={settlingId === p.id}
                      onClick={() => onSettle(p.id, "WIN")}
                      style={{ marginRight: 6 }}
                    >WIN</button>
                    <button
                      disabled={settlingId === p.id}
                      onClick={() => onSettle(p.id, "LOSE")}
                      style={{ marginRight: 6 }}
                    >LOSE</button>
                    <button
                      disabled={settlingId === p.id}
                      onClick={() => onSettle(p.id, "PUSH")}
                    >PUSH</button>
                  </span>
                )) || "—"}
              </td>

              <td style={{ color: (p.profit ?? 0) >= 0 ? "var(--green,#4caf50)" : "#e53935" }}>
                {(p.profit ?? 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TipsterDetailPage;