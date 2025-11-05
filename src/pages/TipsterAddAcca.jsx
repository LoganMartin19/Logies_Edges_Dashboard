import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchDailyFixtures, createTipsterAcca } from "../api";

const todayStr = () => new Date().toISOString().slice(0,10);

export default function TipsterAddAcca() {
  const { username } = useParams();
  const nav = useNavigate();

  const [day, setDay] = useState(todayStr());
  const [sport, setSport] = useState("football");
  const [fixtures, setFixtures] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stake, setStake] = useState(1.0);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchDailyFixtures(day, sport).then(setFixtures).catch(()=>setFixtures([]));
  }, [day, sport]);

  const markets = ["HOME_WIN","AWAY_WIN","DRAW","BTTS","OVER_2_5","UNDER_2_5"];

  const addLeg = (fx) => setLegs([...legs, {
    fixture_id: fx.id,
    market: "HOME_WIN",
    price: 2.0,
    bookmaker: "bet365",
    home_name: fx.home?.name || fx.home_name || "Home",
    away_name: fx.away?.name || fx.away_name || "Away",
  }]);

  const rmLeg = (i) => setLegs(legs.filter((_, idx) => idx !== i));

  const combined = useMemo(
    () => legs.reduce((acc, l) => acc * (parseFloat(l.price) || 1), 1),
    [legs]
  );

  const submit = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      if (legs.length < 2) throw new Error("Acca needs at least 2 legs");
      await createTipsterAcca(username, { stake: parseFloat(stake)||1, legs });
      nav(`/tipsters/${username}`);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2.message);
    }
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <h2>New Acca</h2>
      <div style={{ display:"flex", gap:8, margin:"8px 0 16px" }}>
        <label>Day: <input type="date" value={day} onChange={e=>setDay(e.target.value)} /></label>
        <label>Sport:
          <select value={sport} onChange={e=>setSport(e.target.value)}>
            <option value="football">Football</option>
            <option value="nba">NBA</option>
            <option value="nhl">NHL</option>
            <option value="nfl">NFL</option>
            <option value="cfb">CFB</option>
          </select>
        </label>
      </div>

      <div style={{ display:"grid", gap:8 }}>
        {fixtures.map(fx => (
          <div key={fx.id} style={{ display:"flex", alignItems:"center", gap:8, background:"#0c331f", padding:8, borderRadius:8 }}>
            <div style={{ fontWeight:600 }}>{fx.home?.name || fx.home_name}</div>
            <div style={{ opacity:.7 }}>vs</div>
            <div style={{ fontWeight:600 }}>{fx.away?.name || fx.away_name}</div>
            <button onClick={() => addLeg(fx)} style={{ marginLeft:"auto" }}>Add leg</button>
          </div>
        ))}
      </div>

      <h3 style={{ marginTop:20 }}>Legs ({legs.length})</h3>
      <form onSubmit={submit}>
        {legs.map((l, i) => (
          <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 120px 100px 110px 28px", gap:8, alignItems:"center", marginBottom:8 }}>
            <div><strong>{l.home_name}</strong> vs <strong>{l.away_name}</strong></div>
            <select value={l.market} onChange={e=>{
              const v=[...legs]; v[i]={...v[i], market:e.target.value}; setLegs(v);
            }}>{markets.map(m=> <option key={m} value={m}>{m}</option>)}</select>
            <input type="text" value={l.bookmaker} onChange={e=>{
              const v=[...legs]; v[i]={...v[i], bookmaker:e.target.value}; setLegs(v);
            }} />
            <input type="number" min="1" step="0.01" value={l.price} onChange={e=>{
              const v=[...legs]; v[i]={...v[i], price:e.target.value}; setLegs(v);
            }} />
            <button type="button" onClick={()=>rmLeg(i)}>✕</button>
          </div>
        ))}

        <div style={{ display:"flex", gap:16, marginTop:12, alignItems:"center" }}>
          <label>Stake: <input type="number" min="0.1" step="0.1" value={stake} onChange={e=>setStake(e.target.value)} /></label>
          <div>Combined: <strong>{combined.toFixed(2)}</strong></div>
          <div>Potential Profit: <strong>{(stake*(combined-1)).toFixed(2)}</strong></div>
          <button type="submit" className="btnPrimary" style={{ marginLeft:"auto" }}>Create Acca</button>
        </div>
        {err && <div style={{ color:"salmon", marginTop:8 }}>{err}</div>}
      </form>
    </div>
  );
}