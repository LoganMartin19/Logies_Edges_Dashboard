// src/components/FeaturedRecord.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";

const pill = {
  display: "inline-flex", gap: 10, alignItems: "baseline",
  background: "rgba(255,255,255,.1)", borderRadius: 999,
  padding: "6px 12px", color: "#fff", fontWeight: 600, cursor: "pointer"
};
const small = { fontSize: 12, opacity: .9, fontWeight: 500 };

export default function FeaturedRecord({ span="30d" }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get("/api/public/picks/record", { params: { span } })
      .then(({data}) => alive && setData(data))
      .catch(() => alive && setData(null));
    return () => { alive = false; };
  }, [span]);

  if (!data) return null;
  const s = data.summary || {};
  const rec = `${s.won || 0}W-${s.lost || 0}L-${s.void || 0}V`;
  const roi = s.roi?.toFixed(1) ?? "0.0";

  return (
    <>
      <div style={pill} onClick={() => setOpen(true)} title="Click for details">
        <span>Record: {rec}</span>
        <span style={small}>ROI {roi}%</span>
        <span style={small}>({data.count} picks / {span})</span>
      </div>

      {open && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000
        }}
          onClick={() => setOpen(false)}
        >
          <div style={{ background:"#111", color:"#fff", width:"min(940px, 94vw)",
                        borderRadius:12, padding:16 }} onClick={(e)=>e.stopPropagation()}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <h3 style={{margin:0}}>Featured Picks — {span}</h3>
              <button onClick={()=>setOpen(false)}>Close</button>
            </div>

            {/* KPIs */}
            <div style={{display:"flex", gap:18, margin:"12px 0 8px", flexWrap:"wrap"}}>
              <div><b>Staked:</b> £{(s.staked||0).toFixed(2)}</div>
              <div><b>Returned:</b> £{(s.returned||0).toFixed(2)}</div>
              <div><b>P/L:</b> £{(s.pnl||0).toFixed(2)}</div>
              <div><b>ROI:</b> {roi}%</div>
              <div><b>Record:</b> {rec}</div>
            </div>

            {/* Table */}
            <div style={{overflow:"auto", maxHeight:"70vh", borderTop:"1px solid #222"}}>
              <table style={{width:"100%", borderCollapse:"collapse"}}>
                <thead>
                  <tr>
                    <th align="left">Fixture</th>
                    <th align="left">Comp</th>
                    <th align="left">Market</th>
                    <th align="left">Book</th>
                    <th align="right">Odds</th>
                    <th align="right">Stake</th>
                    <th align="right">Result</th>
                    <th align="right">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.picks||[]).map((p) => {
                    const stake = +p.stake || 0;
                    const price = +p.price || 0;
                    const res = (p.result||"").toLowerCase();
                    let units = 0;
                    if (res === "won") units = stake*(price-1);
                    else if (res === "lost") units = -stake;
                    // void -> 0
                    return (
                      <tr key={p.pick_id} style={{ borderTop:"1px solid #222" }}>
                        <td><b>{p.home_team}</b> vs {p.away_team}</td>
                        <td>{p.comp || "-"}</td>
                        <td>{p.market}</td>
                        <td>{p.bookmaker}</td>
                        <td align="right">{price ? price.toFixed(2) : "—"}</td>
                        <td align="right">{stake ? stake.toFixed(2) : "—"}</td>
                        <td align="right" style={{ color: res==="won" ? "#5efc82" : res==="lost" ? "#ff6b6b" : "#bbb" }}>
                          {res || "—"}
                        </td>
                        <td align="right" style={{ color: units>0?"#5efc82":units<0?"#ff6b6b":"#bbb" }}>
                          {units ? units.toFixed(2) : "0.00"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Kelly calc (inline) */}
            <div style={{marginTop:14}}>
              <KellyWidget />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* --- Kelly calculator inline widget --- */
function KellyWidget() {
  const [bankroll, setBankroll] = useState(1000);
  const [prob, setProb] = useState(0.55); // 55%
  const [odds, setOdds] = useState(1.91); // dec odds
  const [half, setHalf] = useState(true);

  const b = Math.max(0, odds - 1);
  const p = Math.min(0.9999, Math.max(0, prob));
  const q = 1 - p;
  const kelly = b > 0 ? Math.max(0, (b * p - q) / b) : 0; // fraction of bankroll
  const frac = half ? kelly/2 : kelly;
  const stake = bankroll * frac;

  return (
    <div style={{border:"1px solid #222", borderRadius:10, padding:12}}>
      <div style={{fontWeight:700, marginBottom:8}}>Kelly Stake Calculator</div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10}}>
        <label>Bankroll (£)
          <input value={bankroll} onChange={e=>setBankroll(+e.target.value||0)} inputMode="decimal" />
        </label>
        <label>Model Probability (0–1)
          <input value={prob} onChange={e=>setProb(+e.target.value||0)} inputMode="decimal" />
        </label>
        <label>Odds (decimal)
          <input value={odds} onChange={e=>setOdds(+e.target.value||0)} inputMode="decimal" />
        </label>
        <label>Fraction
          <div>
            <label><input type="checkbox" checked={half} onChange={()=>setHalf(!half)} /> Use half-Kelly</label>
          </div>
        </label>
      </div>
      <div style={{marginTop:10}}>
        <b>Kelly f*:</b> {(kelly*100).toFixed(2)}% &nbsp;|&nbsp; <b>Stake:</b> £{stake.toFixed(2)}
      </div>
      <div style={{opacity:.8, fontSize:12, marginTop:6}}>
        Formula: f* = (b·p − q) / b where b = odds − 1, p = model win prob, q = 1 − p.
        Many bettors use ½-Kelly to reduce variance.
      </div>
    </div>
  );
}