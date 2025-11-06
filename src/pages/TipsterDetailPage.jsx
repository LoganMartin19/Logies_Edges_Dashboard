import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  fetchTipster,
  fetchTipsterPicks,
  fetchFixture,
  fetchTipsterAccas,
  settleTipsterPick,
  deleteTipsterPick,
  settleTipsterAcca,
  deleteTipsterAcca,
} from "../api";
import { useAuth } from "../components/AuthGate";

const useFixturesMap = (picks) => {
  const [map, setMap] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = [...new Set((picks || []).map((p) => p.fixture_id))].filter(Boolean);
      const out = {};
      for (const id of ids) {
        try {
          out[id] = await fetchFixture(id);
        } catch {}
      }
      if (!cancelled) setMap(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [picks]);
  return map;
};

const TeamCell = ({ fixture }) => {
  if (!fixture) return <>Fixture</>;
  const h = fixture.home || {};
  const a = fixture.away || {};
  const Logo = ({ src, name }) => (
    <img
      src={src || "/badge.png"}
      alt={name}
      style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain" }}
    />
  );
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <Logo src={h.logo} name={h.name} />
      <span style={{ fontWeight: 600 }}>{h.name}</span>
      <span style={{ opacity: 0.7 }}>vs</span>
      <span style={{ fontWeight: 600 }}>{a.name}</span>
      <Logo src={a.logo} name={a.name} />
    </div>
  );
};

const number = (x, d = 2) => (typeof x === "number" ? x.toFixed(d) : "—");

const ResultBadge = ({ result }) => {
  if (!result) return <span className="badge neutral">—</span>;
  const cls =
    result === "WIN"
      ? "win"
      : result === "LOSE"
      ? "lose"
      : result === "PUSH"
      ? "push"
      : result === "VOID"
      ? "void"
      : "neutral";
  return <span className={`badge ${cls}`}>{result}</span>;
};

const SettleButtons = ({ onSettle, disabled }) => (
  <div className="settleRow">
    <button className="btnTag win" disabled={disabled} onClick={() => onSettle("WIN")}>
      WIN
    </button>
    <button className="btnTag lose" disabled={disabled} onClick={() => onSettle("LOSE")}>
      LOSE
    </button>
    <button className="btnTag push" disabled={disabled} onClick={() => onSettle("PUSH")}>
      PUSH
    </button>
    <button className="btnTag void" disabled={disabled} onClick={() => onSettle("VOID")}>
      VOID
    </button>
  </div>
);

export default function TipsterDetailPage() {
  const { username } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);
  const [accas, setAccas] = useState([]);

  // busy flags (so we can disable a specific row while acting)
  const [busyPickId, setBusyPickId] = useState(null);
  const [busyAccaId, setBusyAccaId] = useState(null);

  useEffect(() => {
    fetchTipster(username).then(setTipster).catch(() => setTipster(null));
    fetchTipsterPicks(username).then(setPicks).catch(() => setPicks([]));
    fetchTipsterAccas(username).then(setAccas).catch(() => setAccas([]));
  }, [username]);

  const fxMap = useFixturesMap(picks);

  if (!tipster) return <div>Loading…</div>;
  const isOwner = !!tipster.is_owner;

  // --- Handlers: Picks ---
  const handleSettlePick = async (pick, result) => {
    try {
      setBusyPickId(pick.id);
      const updated = await settleTipsterPick(pick.id, result);
      setPicks((prev) => prev.map((p) => (p.id === pick.id ? { ...p, ...updated } : p)));
    } catch (e) {
      console.error(e);
      alert("Failed to settle pick.");
    } finally {
      setBusyPickId(null);
    }
  };

  const handleDeletePick = async (pick) => {
    if (!pick?.can_delete) return;
    if (!window.confirm("Delete this pick? This cannot be undone.")) return;
    try {
      setBusyPickId(pick.id);
      await deleteTipsterPick(pick.id);
      setPicks((prev) => prev.filter((p) => p.id !== pick.id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete pick.");
    } finally {
      setBusyPickId(null);
    }
  };

  // --- Handlers: Accas ---
  const handleSettleAcca = async (acca, result) => {
    try {
      setBusyAccaId(acca.id);
      const updated = await settleTipsterAcca(acca.id, result);
      setAccas((prev) => prev.map((a) => (a.id === acca.id ? { ...a, ...updated } : a)));
    } catch (e) {
      console.error(e);
      alert("Failed to settle acca.");
    } finally {
      setBusyAccaId(null);
    }
  };

  const handleDeleteAcca = async (acca) => {
    if (!acca?.can_delete) return;
    if (!window.confirm("Delete this acca? This cannot be undone.")) return;
    try {
      setBusyAccaId(acca.id);
      await deleteTipsterAcca(acca.id);
      setAccas((prev) => prev.filter((a) => a.id !== acca.id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete acca.");
    } finally {
      setBusyAccaId(null);
    }
  };

  return (
    <div className="page">
      <Link to="/tipsters">← Back</Link>

      <div className="profile">
        <img
          src={
            tipster.avatar_url ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(tipster.name)}`
          }
          alt={tipster.name}
          className="avatar"
        />
        <div>
          <h2 style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {tipster.name} {tipster.is_verified && "✅"}
            {isOwner && (
              <>
                <button
                  onClick={() => nav(`/tipsters/${tipster.username}/new-pick`)}
                  className="btnSmall"
                >
                  + Add Pick
                </button>
                <button
                  onClick={() => nav(`/tipsters/${tipster.username}/new-acca`)}
                  className="btnSmall btnGhost"
                >
                  + New Acca
                </button>
              </>
            )}
          </h2>
          <p>@{tipster.username}</p>
          <p>{tipster.bio}</p>
          <div className="metrics">
            <span>ROI: {number(tipster.roi_30d)}%</span>
            <span>Profit: {number(tipster.profit_30d)}</span>
            <span>Winrate: {number(tipster.winrate_30d)}%</span>
          </div>
        </div>
      </div>

      <h3>Recent Picks</h3>
      <table className="picks">
        <thead>
          <tr>
            <th>Fixture</th>
            <th>Market</th>
            <th>Bookmaker</th>
            <th>Odds</th>
            <th>Stake</th>
            <th>Result</th>
            <th style={{ textAlign: "right" }}>EV</th>
            <th style={{ textAlign: "right" }}>Profit</th>
            {isOwner && <th style={{ width: 220 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {picks.map((p) => {
            const fx = fxMap[p.fixture_id];
            const settled = !!p.result;
            return (
              <tr key={p.id}>
                <td>
                  <Link
                    to={`/fixture/${p.fixture_id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <TeamCell fixture={fx} />
                  </Link>
                </td>
                <td>{p.market}</td>
                <td>{p.bookmaker || "—"}</td>
                <td>{number(p.price)}</td>
                <td>{number(p.stake)}</td>
                <td>
                  <ResultBadge result={p.result} />
                </td>
                <td
                  style={{
                    textAlign: "right",
                    color: (p.model_edge ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                  }}
                >
                  {p.model_edge == null ? "—" : number(p.model_edge * 100, 1) + "%"}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    color: (p.profit ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                  }}
                >
                  {number(p.profit)}
                </td>
                {isOwner && (
                  <td>
                    <div className="actionsCell">
                      {!settled && (
                        <SettleButtons
                          disabled={busyPickId === p.id}
                          onSettle={(res) => handleSettlePick(p, res)}
                        />
                      )}
                      {p.can_delete && (
                        <button
                          className="btnSmall btnDanger"
                          disabled={busyPickId === p.id}
                          onClick={() => handleDeletePick(p)}
                          title="Delete pick"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {accas.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Accas</h3>
          <table className="picks">
            <thead>
              <tr>
                <th>Acca</th>
                <th>Legs</th>
                <th>Combined</th>
                <th>Stake</th>
                <th>Result</th>
                <th style={{ textAlign: "right" }}>Profit</th>
                {isOwner && <th style={{ width: 220 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {accas.map((a) => {
                const settled = !!a.result;
                return (
                  <tr key={a.id}>
                    <td>#{a.id}</td>
                    <td>
                      <div style={{ display: "grid", gap: 6 }}>
                        {a.legs.map((leg, i) => (
                          <Link
                            key={`${a.id}-${i}`}
                            to={`/fixture/${leg.fixture_id}`}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ opacity: 0.7 }}>{i + 1}.</span>
                              <span style={{ fontWeight: 600 }}>{leg.home_name}</span>
                              <span style={{ opacity: 0.7 }}>vs</span>
                              <span style={{ fontWeight: 600 }}>{leg.away_name}</span>
                              <span style={{ marginLeft: 8, opacity: 0.75 }}>{leg.market}</span>
                              <span style={{ marginLeft: "auto", opacity: 0.85 }}>
                                {leg.price?.toFixed(2)}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </td>
                    <td>{number(a.combined_price)}</td>
                    <td>{number(a.stake)}</td>
                    <td>
                      <ResultBadge result={a.result} />
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        color: (a.profit ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                      }}
                    >
                      {number(a.profit)}
                    </td>
                    {isOwner && (
                      <td>
                        <div className="actionsCell">
                          {!settled && (
                            <SettleButtons
                              disabled={busyAccaId === a.id}
                              onSettle={(res) => handleSettleAcca(a, res)}
                            />
                          )}
                          {a.can_delete && (
                            <button
                              className="btnSmall btnDanger"
                              disabled={busyAccaId === a.id}
                              onClick={() => handleDeleteAcca(a)}
                              title="Delete acca"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <style jsx="true">{`
        .profile { display:flex; gap:16px; align-items:center; margin-bottom:20px; }
        .avatar { width:80px; height:80px; border-radius:50%; }
        .metrics { display:flex; gap:12px; font-size:.9rem; margin-top:8px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th, td { border-bottom:1px solid #1e2b21; padding:10px; vertical-align:top; }
        th { text-align:left; background:#0c331f; color:#fff; position:sticky; top:0; z-index:1; }
        .btnSmall { padding:6px 10px; border-radius:8px; background:#2e7d32; color:#fff; border:0; cursor:pointer; }
        .btnGhost { background:transparent; border:1px solid #2e7d32; color:#2e7d32; }
        .btnDanger { background:#a52727; }
        .btnSmall[disabled] { opacity:.6; cursor:not-allowed; }

        .actionsCell { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .settleRow { display:flex; gap:6px; flex-wrap:wrap; }

        .btnTag { padding:4px 8px; border-radius:999px; font-size:.8rem; border:0; cursor:pointer; }
        .btnTag.win { background:#124b27; color:#b6f2c6; }
        .btnTag.lose { background:#4b1212; color:#f2b6b6; }
        .btnTag.push { background:#1f2a44; color:#c8d7ff; }
        .btnTag.void { background:#3b3b3b; color:#e7e7e7; }
        .btnTag:disabled { opacity:.6; cursor:not-allowed; }

        .badge { padding:2px 8px; border-radius:999px; font-size:.75rem; }
        .badge.win { background:#124b27; color:#b6f2c6; }
        .badge.lose { background:#4b1212; color:#f2b6b6; }
        .badge.push { background:#1f2a44; color:#c8d7ff; }
        .badge.void { background:#3b3b3b; color:#e7e7e7; }
        .badge.neutral { background:#263238; color:#e0e0e0; }
      `}</style>
    </div>
  );
}