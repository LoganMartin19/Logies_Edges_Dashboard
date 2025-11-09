// src/pages/Performance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

/* ---- dark palette (styling only) ---- */
const COL = {
  text: "#eaf4ed",
  muted: "rgba(255,255,255,.75)",
  cardBg: "#111",
  cardBorder: "rgba(255,255,255,.12)",
  faint: "rgba(255,255,255,.06)",
  pos: "#0f5828",
  neg: "#c62828",
};

const COMP_NAMES = {
  UCL: "UEFA Champions League", UEL: "UEFA Europa League", UECL: "UEFA Europa Conference League",
  EPL: "Premier League", CHAMP: "EFL Championship", LG1: "EFL League One", LG2: "EFL League Two",
  ENG_FA: "FA Cup", ENG_EFL: "EFL Cup",
  SCO_PREM: "Scottish Premiership", SCO_CHAMP: "Scottish Championship", SCO_1: "Scottish League One",
  SCO_2: "Scottish League Two",
  LIGUE1: "Ligue 1", LIGUE2: "Ligue 2",
  BUNDES: "Bundesliga", BUNDES2: "2. Bundesliga",
  LA_LIGA: "La Liga", LA_LIGA2: "La Liga 2",
  SERIE_A: "Serie A", SERIE_B: "Serie B",
  POR_LIGA: "Primeira Liga",
  BEL_PRO: "Belgian Pro League", BEL_CUP: "Belgian Cup",
  DEN_SL: "Danish Superliga", DEN_CUP: "Danish Cup",
  BR_SERIE_A: "Brazil Serie A", BR_SERIE_B: "Brazil Serie B",
  ARG_LP: "Argentina Primera División",
  MLS: "Major League Soccer",
  NFL: "NFL", NCAA: "College Football", CFB: "College Football",
};
const prettyComp = (c) => COMP_NAMES[c] || c || "—";

const SPANS = [
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

export default function Performance() {
  const [span, setSpan] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get("/api/public/picks/record", { params: { span } })
      .then(({ data }) => { if (alive) setData(data); })
      .catch(() => alive && setData(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [span]);

  // ✅ Stabilise picks reference so downstream useMemos don’t re-run unnecessarily
  const picks = useMemo(
    () => (Array.isArray(data?.picks) ? data.picks : []),
    [data?.picks]
  );

  const kpis = useMemo(() => {
    const s = data?.summary || {};
    return {
      staked: s.staked || 0,
      returned: s.returned || 0,
      pnl: s.pnl || 0,
      roi: s.roi || 0,
      record: s.record || { won: 0, lost: 0, void: 0 },
      count: picks.length,
    };
  }, [data?.summary, picks.length]);

  const byMarket = useMemo(() => {
    const m = {};
    for (const p of picks) {
      const key = p.market || "—";
      if (!m[key]) m[key] = { market: key, picks: 0, won: 0, lost: 0, void: 0, staked: 0, returned: 0 };
      const row = m[key];
      row.picks += 1;
      const stake = Number(p.stake || 1);
      const price = Number(p.price || 0);
      row.staked += stake;
      const res = (p.result || "").toLowerCase();
      if (res === "won" || res === "win") { row.won += 1; row.returned += stake * price; }
      else if (res === "lost" || res === "lose") { row.lost += 1; }
      else { row.void += 1; row.returned += stake; }
    }
    return Object.values(m).map(r => {
      const pnl = r.returned - r.staked;
      const roi = r.staked ? (pnl / r.staked) * 100 : 0;
      return { ...r, pnl, roi };
    }).sort((a, b) => b.roi - a.roi);
  }, [picks]);

  const byLeague = useMemo(() => {
    const m = {};
    for (const p of picks) {
      const key = p.league || "Unknown";
      if (!m[key]) m[key] = { league: key, picks: 0, won: 0, lost: 0, void: 0, staked: 0, returned: 0 };
      const row = m[key];
      row.picks += 1;
      const stake = Number(p.stake || 1);
      const price = Number(p.price || 0);
      row.staked += stake;
      const res = (p.result || "").toLowerCase();
      if (res === "won" || res === "win") { row.won += 1; row.returned += stake * price; }
      else if (res === "lost" || res === "lose") { row.lost += 1; }
      else { row.void += 1; row.returned += stake; }
    }
    return Object.values(m).map(r => {
      const pnl = r.returned - r.staked;
      const roi = r.staked ? (pnl / r.staked) * 100 : 0;
      return { ...r, pnl, roi };
    }).sort((a, b) => b.picks - a.picks);
  }, [picks]);

  const byBook = useMemo(() => {
    const m = {};
    for (const p of picks) {
      const key = p.bookmaker || "—";
      if (!m[key]) m[key] = { bookmaker: key, picks: 0, won: 0, lost: 0, void: 0, staked: 0, returned: 0 };
      const row = m[key];
      row.picks += 1;
      const stake = Number(p.stake || 1);
      const price = Number(p.price || 0);
      row.staked += stake;
      const res = (p.result || "").toLowerCase();
      if (res === "won" || res === "win") { row.won += 1; row.returned += stake * price; }
      else if (res === "lost" || res === "lose") { row.lost += 1; }
      else { row.void += 1; row.returned += stake; }
    }
    return Object.values(m).map(r => {
      const pnl = r.returned - r.staked;
      const roi = r.staked ? (pnl / r.staked) * 100 : 0;
      return { ...r, pnl, roi };
    }).sort((a, b) => b.picks - a.picks);
  }, [picks]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, color: COL.text }}>
      <h1 style={{ marginBottom: 8, color: COL.text }}>Performance</h1>
      <p style={{ marginTop: 0, color: COL.muted }}>
        Live performance of <b>featured</b> picks coming from the API.
      </p>

      {/* span switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {SPANS.map((s) => {
          const active = span === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSpan(s.id)}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? COL.pos : COL.cardBorder}`,
                background: active ? COL.pos : COL.cardBg,
                color: active ? "#fff" : COL.text,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
            <Kpi title="Picks" value={kpis.count} />
            <Kpi title="Record" value={`${kpis.record.won}W-${kpis.record.lost}L-${kpis.record.void}V`} />
            <Kpi title="Staked" value={`£${kpis.staked.toFixed(2)}`} />
            <Kpi title="Returned" value={`£${kpis.returned.toFixed(2)}`} />
            <Kpi title="P/L" value={`£${kpis.pnl.toFixed(2)}`} tone={kpis.pnl > 0 ? "good" : kpis.pnl < 0 ? "bad" : "muted"} />
            <Kpi title="ROI" value={`${kpis.roi.toFixed(1)}%`} tone={kpis.roi > 0 ? "good" : kpis.roi < 0 ? "bad" : "muted"} />
          </div>

          <Section title="By market">
            {!byMarket.length ? (
              <p style={{ color: COL.muted }}>No picks for this period.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COL.faint }}>
                    <Th>Market</Th>
                    <Th align="right">Picks</Th>
                    <Th align="right">Record</Th>
                    <Th align="right">ROI</Th>
                    <Th>ROI bar</Th>
                  </tr>
                </thead>
                <tbody>
                  {byMarket.map((m) => (
                    <tr key={m.market} style={{ borderTop: `1px solid ${COL.cardBorder}` }}>
                      <Td>{m.market}</Td>
                      <Td align="right">{m.picks}</Td>
                      <Td align="right">{m.won}W-{m.lost}L-{m.void}V</Td>
                      <Td align="right" style={{ color: m.roi > 0 ? COL.pos : m.roi < 0 ? COL.neg : COL.text }}>
                        {m.roi.toFixed(1)}%
                      </Td>
                      <Td><Bar value={m.roi} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="By league / competition">
            {!byLeague.length ? (
              <p style={{ color: COL.muted }}>No picks for this period.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COL.faint }}>
                    <Th>League</Th>
                    <Th align="right">Picks</Th>
                    <Th align="right">Record</Th>
                    <Th align="right">ROI</Th>
                    <Th>ROI bar</Th>
                  </tr>
                </thead>
                <tbody>
                  {byLeague.map((l) => (
                    <tr key={l.league} style={{ borderTop: `1px solid ${COL.cardBorder}` }}>
                      <Td>{prettyComp(l.league)}</Td>
                      <Td align="right">{l.picks}</Td>
                      <Td align="right">{l.won}W-{l.lost}L-{l.void}V</Td>
                      <Td align="right" style={{ color: l.roi > 0 ? COL.pos : l.roi < 0 ? COL.neg : COL.text }}>
                        {l.roi.toFixed(1)}%
                      </Td>
                      <Td><Bar value={l.roi} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="By source / bookmaker">
            {!byBook.length ? (
              <p style={{ color: COL.muted }}>No picks for this period.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: COL.faint }}>
                    <Th>Bookmaker</Th>
                    <Th align="right">Picks</Th>
                    <Th align="right">Record</Th>
                    <Th align="right">ROI</Th>
                    <Th>ROI bar</Th>
                  </tr>
                </thead>
                <tbody>
                  {byBook.map((b) => (
                    <tr key={b.bookmaker} style={{ borderTop: `1px solid ${COL.cardBorder}` }}>
                      <Td>{b.bookmaker}</Td>
                      <Td align="right">{b.picks}</Td>
                      <Td align="right">{b.won}W-{b.lost}L-{b.void}V</Td>
                      <Td align="right" style={{ color: b.roi > 0 ? COL.pos : b.roi < 0 ? COL.neg : COL.text }}>
                        {b.roi.toFixed(1)}%
                      </Td>
                      <Td><Bar value={b.roi} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value, tone = "neutral" }) {
  const bg =
    tone === "good" ? "rgba(15,88,40,.15)" :
    tone === "bad"  ? "rgba(198,40,40,.12)" :
                      "rgba(255,255,255,.06)";
  const col = tone === "good" ? COL.pos : tone === "bad" ? COL.neg : COL.text;
  return (
    <div style={{
      background: bg,
      border: `1px solid ${COL.cardBorder}`,
      borderRadius: 12,
      padding: "10px 12px",
      minWidth: 120,
      color: COL.text
    }}>
      <div style={{ fontSize: 12, color: COL.muted }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: col }}>{value}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginTop: 24 }}>
      <h3 style={{ 
        marginBottom: 10, 
        color: "#eaf4ed",
        borderBottom: "1px solid rgba(255,255,255,0.1)", 
        paddingBottom: 4 
      }}>
        {title}
      </h3>
      <div
        style={{
          background: "#111",
          color: "#eaf4ed",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,.12)",
          padding: 12,
          overflowX: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "6px 4px",
        fontSize: 13,
        whiteSpace: "nowrap",
        color: COL.text,
        background: "transparent",
        borderBottom: `1px solid ${COL.cardBorder}`,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  return (
    <td
      style={{
        textAlign: align,
        padding: "6px 4px",
        fontSize: 13,
        color: COL.text,
        borderBottom: `1px solid ${COL.cardBorder}`,
      }}
    >
      {children}
    </td>
  );
}

function Bar({ value }) {
  const max = 100;
  const pct = Math.max(0, Math.min(Math.abs(value), max));
  const isNeg = value < 0;
  return (
    <div style={{ height: 10, background: COL.faint, borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          width: pct + "%",
          height: "100%",
          background: isNeg ? COL.neg : COL.pos,
          transition: "width .25s ease-out",
        }}
      />
    </div>
  );
}