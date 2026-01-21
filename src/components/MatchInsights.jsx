import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

const niceMarket = (m) =>
  ({
    BTTS_Y: "BTTS Yes",
    BTTS_N: "BTTS No",
    "O2.5": "Over 2.5",
    "U2.5": "Under 2.5",
    HOME_WIN: "Home Win",
    DRAW: "Draw",
    AWAY_WIN: "Away Win",
    "1X": "Double Chance (1X)",
    X2: "Double Chance (X2)",
    "12": "Double Chance (12)",
  }[m] || m);

const confTone = (c) => {
  const x = String(c || "").toLowerCase();
  if (x.includes("high")) return { bg: "rgba(34,197,94,.12)", bd: "rgba(34,197,94,.35)", fg: "#166534", label: "High" };
  if (x.includes("med")) return { bg: "rgba(245,158,11,.12)", bd: "rgba(245,158,11,.35)", fg: "#92400e", label: "Med" };
  if (x.includes("low")) return { bg: "rgba(148,163,184,.20)", bd: "rgba(148,163,184,.35)", fg: "#334155", label: "Low" };
  return { bg: "rgba(148,163,184,.16)", bd: "rgba(148,163,184,.28)", fg: "#334155", label: c || "" };
};

export default function MatchInsights({
  fixtureId,
  model = "team_form",
  limit = 8,          // ✅ show more markets by default
  showConfidence = true,
}) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const url = useMemo(() => `/api/fixtures/${fixtureId}/insights`, [fixtureId]);

  useEffect(() => {
    if (!fixtureId) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setErr(null);

      try {
        const res = await api.get(url, { params: { model } });
        if (cancelled) return;
        setData(res.data);
      } catch (e) {
        if (cancelled) return;

        const status = e?.response?.status;
        const body = e?.response?.data;
        const msg =
          body?.detail ||
          (typeof body === "string" ? body : null) ||
          e?.message ||
          "Request failed";

        console.error("[MatchInsights] request failed", {
          url,
          model,
          status,
          body,
          error: e,
        });

        setErr({ status, msg });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fixtureId, model, url]);

  if (!fixtureId) return null;

  // Keep container visible while loading so layout doesn’t jump
  const containerStyle = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,.08)",
    background: "#fff",
  };

  if (loading && !data) {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Match Insights</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>Model fair prices</div>
        </div>
        <div style={{ opacity: 0.7, marginTop: 6, fontSize: 12 }}>Loading fair prices…</div>
      </div>
    );
  }

  // Don’t show a scary red box on prod; keep it subtle
  if (err) {
    return (
      <div
        style={{
          ...containerStyle,
          border: "1px solid rgba(0,0,0,.10)",
          background: "rgba(0,0,0,.02)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Match Insights</div>
          <div style={{ fontSize: 12, opacity: 0.65 }}>Unavailable</div>
        </div>
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
          Could not load insights right now.
        </div>

        {/* If you want to show status only (safe for users) */}
        <div style={{ marginTop: 6, fontSize: 11, opacity: 0.55 }}>
          Status: {err.status ?? "unknown"}
        </div>
      </div>
    );
  }

  const insights = data?.insights || [];
  if (!insights.length) return null;

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div style={{ fontWeight: 800, fontSize: 15 }}>Match Insights</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>Model fair prices</div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {insights.slice(0, limit).map((x) => {
          const conf = confTone(x.confidence);
          const fair = Number(x.fair_odds);
          const prob = Number(x.prob);

          return (
            <div
              key={x.market}
              style={{
                padding: "9px 10px",
                borderRadius: 12,
                background: "rgba(0,0,0,.035)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                  <div style={{ fontWeight: 750, fontSize: 13, whiteSpace: "nowrap" }}>
                    {niceMarket(x.market)}
                  </div>

                  {showConfidence && x.confidence ? (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        border: `1px solid ${conf.bd}`,
                        background: conf.bg,
                        color: conf.fg,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                      title={`Confidence: ${x.confidence}`}
                    >
                      {conf.label}
                    </span>
                  ) : null}
                </div>

                <div style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                  <span style={{ opacity: 0.75 }}>Fair:</span>{" "}
                  <b>{Number.isFinite(fair) ? fair.toFixed(2) : "-"}</b>
                  <span style={{ opacity: 0.6 }}>
                    {" "}
                    ({Number.isFinite(prob) ? (prob * 100).toFixed(1) : "-"}%)
                  </span>
                </div>
              </div>

              {x.blurb ? (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.82, lineHeight: 1.35 }}>
                  {x.blurb}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, opacity: 0.62, lineHeight: 1.35 }}>
        Note: “Fair” = model probability converted to odds (no bookmaker margin). Market odds can move
        before CSB refreshes.
      </div>
    </div>
  );
}