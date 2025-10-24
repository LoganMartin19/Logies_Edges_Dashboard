// src/components/KellyHelper.jsx
import React, { useMemo, useState } from "react";

export default function KellyHelper({ estProb = 0.55, price = 1.90, bankroll = 1000 }) {
  const [p, setP] = useState(estProb);
  const [o, setO] = useState(price);
  const [br, setBr] = useState(bankroll);

  const kelly = useMemo(() => {
    const b = o - 1;                 // net odds in decimal
    const q = 1 - p;
    const f = (b*p - q) / b;         // Kelly fraction
    return Math.max(0, f || 0);      // floor at 0
  }, [p, o]);

  const stake = kelly * br;

  return (
    <div style={{ background:"#111", color:"#fff", borderRadius:12, padding:12 }}>
      <div style={{ fontWeight:700, marginBottom:6 }}>Kelly Calculator</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8 }}>
        <label>Prob %<input type="number" value={(p*100).toFixed(1)} onChange={e => setP(Math.max(0, Math.min(1, (+e.target.value||0)/100)))} /></label>
        <label>Odds (Dec)<input type="number" step="0.01" value={o} onChange={e => setO(+e.target.value||0)} /></label>
        <label>Bankroll<input type="number" value={br} onChange={e => setBr(+e.target.value||0)} /></label>
      </div>
      <div style={{ marginTop:8 }}>
        Kelly fraction: <b>{(kelly*100).toFixed(2)}%</b> • Suggested stake: <b>{stake.toFixed(2)}</b>
      </div>
      <div style={{ fontSize:12, opacity:.75, marginTop:6 }}>
        Kelly = ((Odds−1)×p − (1−p)) / (Odds−1). Many bettors use ½-Kelly for lower volatility.
      </div>
    </div>
  );
}