import React, { useEffect, useState } from "react";
import { api } from "../api";

const niceMarket = (m) => ({
  "BTTS_Y": "BTTS Yes",
  "BTTS_N": "BTTS No",
  "O2.5": "Over 2.5",
  "U2.5": "Under 2.5",
  "HOME_WIN": "Home Win",
  "DRAW": "Draw",
  "AWAY_WIN": "Away Win",
  "1X": "Double Chance (1X)",
  "X2": "Double Chance (X2)",
  "12": "Double Chance (12)",
}[m] || m);

export default function MatchInsights({ fixtureId, model = "team_form" }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/api/fixtures/${fixtureId}/insights`, { params: { model }});
        if (!cancelled) setData(data);
      } catch (e) {
        if (!cancelled) setErr("Could not load match insights.");
      }
    })();
    return () => (cancelled = true);
  }, [fixtureId, model]);

  if (err) return null;
  if (!data) return (
    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(0,0,0,.08)", background: "#fff" }}>
      <b>Match Insights</b>
      <div style={{ opacity: 0.7, marginTop: 6 }}>Loading fair prices…</div>
    </div>
  );

  const insights = data.insights || [];
  if (!insights.length) return null;

  return (
    <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(0,0,0,.08)", background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>Match Insights</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Model fair prices</div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {insights.slice(0, 6).map((x) => (
          <div key={x.market} style={{ padding: 10, borderRadius: 12, background: "rgba(0,0,0,.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>{niceMarket(x.market)}</div>
              <div style={{ fontSize: 13 }}>
                <span style={{ opacity: 0.75 }}>Fair:</span>{" "}
                <b>{Number(x.fair_odds).toFixed(2)}</b>
                <span style={{ opacity: 0.6 }}> ({(x.prob * 100).toFixed(1)}%)</span>
              </div>
            </div>
            {x.blurb ? (
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>
                {x.blurb}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
        Note: “Fair” = model probability converted to odds (no bookmaker margin). Market odds can move before CSB refreshes.
      </div>
    </div>
  );
}