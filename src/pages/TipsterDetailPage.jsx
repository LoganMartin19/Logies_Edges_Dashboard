import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  fetchTipster, fetchTipsterPicks, fetchFixture, fetchTipsterAccas
} from "../api";
import { useAuth } from "../components/AuthGate";

const useFixturesMap = (picks) => {
  const [map, setMap] = useState({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ids = [...new Set((picks || []).map(p => p.fixture_id))].filter(Boolean);
      const out = {};
      for (const id of ids) {
        try { out[id] = await fetchFixture(id); } catch {}
      }
      if (!cancelled) setMap(out);
    })();
    return () => { cancelled = true; };
  }, [picks]);
  return map;
};

const TeamCell = ({ fixture }) => {
  if (!fixture) return <>Fixture</>;
  const h = fixture.home || {};
  const a = fixture.away || {};
  const Logo = ({ src, name }) => (
    <img src={src || "/badge.png"} alt={name}
         style={{ width: 18, height: 18, borderRadius: 4, objectFit: "contain" }} />
  );
  return (
    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
      <Logo src={h.logo} name={h.name} />
      <span style={{ fontWeight:600 }}>{h.name}</span>
      <span style={{ opacity:.7 }}>vs</span>
      <span style={{ fontWeight:600 }}>{a.name}</span>
      <Logo src={a.logo} name={a.name} />
    </div>
  );
};

const number = (x, d=2) => (typeof x === "number" ? x.toFixed(d) : "—");

export default function TipsterDetailPage() {
  const { username } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [tipster, setTipster] = useState(null);
  const [picks, setPicks] = useState([]);
  const [accas, setAccas] = useState([]);

  useEffect(() => {
    fetchTipster(username).then(setTipster).catch(() => setTipster(null));
    fetchTipsterPicks(username).then(setPicks).catch(() => setPicks([]));
    fetchTipsterAccas(username).then(setAccas).catch(() => setAccas([]));
  }, [username]);

  const fxMap = useFixturesMap(picks);

  if (!tipster) return <div>Loading…</div>;
  const isOwner = !!tipster.is_owner;

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
          <h2 style={{ display:"flex", gap:10, alignItems:"center" }}>
            {tipster.name} {tipster.is_verified && "✅"}
            {isOwner && (
              <>
                <button onClick={() => nav(`/tipsters/${tipster.username}/new-pick`)}
                        className="btnSmall">+ Add Pick</button>
                <button onClick={() => nav(`/tipsters/${tipster.username}/new-acca`)}
                        className="btnSmall btnGhost">+ New Acca</button>
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
            <th>Fixture</th><th>Market</th><th>Bookmaker</th>
            <th>Odds</th><th>Stake</th><th>Result</th>
            <th style={{textAlign:"right"}}>EV</th>
            <th style={{textAlign:"right"}}>Profit</th>
          </tr>
        </thead>
        <tbody>
          {picks.map(p => {
            const fx = fxMap[p.fixture_id];
            return (
              <tr key={p.id}>
                <td>
                  <Link to={`/fixture/${p.fixture_id}`} style={{ textDecoration:"none", color:"inherit" }}>
                    <TeamCell fixture={fx} />
                  </Link>
                </td>
                <td>{p.market}</td>
                <td>{p.bookmaker || "—"}</td>
                <td>{number(p.price)}</td>
                <td>{number(p.stake)}</td>
                <td>{p.result || "—"}</td>
                <td style={{ textAlign:"right", color: (p.model_edge ?? 0) >= 0 ? "#1db954":"#d23b3b" }}>
                  {p.model_edge == null ? "—" : number(p.model_edge*100,1) + "%"}
                </td>
                <td style={{ textAlign:"right", color: (p.profit ?? 0) >= 0 ? "#1db954":"#d23b3b" }}>
                  {number(p.profit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {accas.length > 0 && (
        <>
          <h3 style={{ marginTop:24 }}>Accas</h3>
          <table className="picks">
            <thead>
              <tr>
                <th>Acca</th><th>Legs</th><th>Combined</th><th>Stake</th><th>Result</th><th style={{textAlign:"right"}}>Profit</th>
              </tr>
            </thead>
            <tbody>
              {accas.map(a => (
                <tr key={a.id}>
                  <td>#{a.id}</td>
                  <td>
                    <div style={{ display:"grid", gap:6 }}>
                      {a.legs.map((leg, i) => (
                        <Link key={i} to={`/fixture/${leg.fixture_id}`} style={{ textDecoration:"none", color:"inherit" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ opacity:.7 }}>{i+1}.</span>
                            <span style={{ fontWeight:600 }}>{leg.home_name}</span>
                            <span style={{ opacity:.7 }}>vs</span>
                            <span style={{ fontWeight:600 }}>{leg.away_name}</span>
                            <span style={{ marginLeft:8, opacity:.75 }}>{leg.market}</span>
                            <span style={{ marginLeft:"auto", opacity:.85 }}>{leg.price?.toFixed(2)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </td>
                  <td>{number(a.combined_price)}</td>
                  <td>{number(a.stake)}</td>
                  <td>{a.result || "—"}</td>
                  <td style={{ textAlign:"right", color: (a.profit ?? 0) >= 0 ? "#1db954":"#d23b3b" }}>
                    {number(a.profit)}
                  </td>
                </tr>
              ))}
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
        th { text-align:left; background:#0c331f; color:#fff; position:sticky; top:0; }
        .btnSmall { padding:6px 10px; border-radius:8px; background:#2e7d32; color:#fff; border:0; cursor:pointer; }
        .btnGhost { background:transparent; border:1px solid #2e7d32; color:#2e7d32; }
      `}</style>
    </div>
  );
}