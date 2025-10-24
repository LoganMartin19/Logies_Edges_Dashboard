// src/pages/PublicDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_BASE } from "../api"; // ← env-driven base
import FeaturedRecord from "../components/FeaturedRecord";
// --- tiny utils -------------------------------------------------------------
const todayISO = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

// UK local time (BST/GMT). Safe with/without timezone in the string.
const toUK = (iso, { withZone = false } = {}) => {
  if (!iso) return "—";
  const fmt = { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit" };
  if (withZone) fmt.timeZoneName = "short";
  try {
    const d = new Date(iso);
    if (!isNaN(d)) return d.toLocaleTimeString("en-GB", fmt);
  } catch {}
  try {
    const safe = iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z";
    return new Date(safe).toLocaleTimeString("en-GB", fmt);
  } catch {
    return iso.slice(11, 16);
  }
};

const slug = (s = "") =>
  s.normalize("NFKD").replace(/[^\w\s.-]/g, "").trim().replace(/\s+/g, "_").toLowerCase();

// Human-readable competition names (expandable)
const COMP_NAMES = {
  UCL: "UEFA Champions League",
  UEL: "UEFA Europa League",
  UECL: "UEFA Europa Conference League",
  UWCL: "UEFA Women’s Champions League",
  WCQ_EUR: "World Cup Qualifying (Europe)",
  EPL: "Premier League",
  CHAMP: "EFL Championship",
  LG1: "EFL League One",
  LG2: "EFL League Two",
  EFL_TROPHY: "EFL Trophy",
  FA_CUP: "FA Cup",
  CARABAO: "EFL Cup",
  SCO_PREM: "Scottish Premiership",
  SCO_CHAMP: "Scottish Championship",
  SCO1: "Scottish League One",
  SCO2: "Scottish League Two",
  SCO_CUP: "Scottish Cup",
  LA_LIGA: "La Liga",
  BUNDES: "Bundesliga",
  BUNDES2: "2. Bundesliga",
  SERIE_A: "Serie A",
  SERIE_B: "Serie B",
  LIGUE1: "Ligue 1",
  MLS: "Major League Soccer",
  BR_SERIE_A: "Brasileirão Série A",
  NFL: "NFL",
  CFB: "College Football",
  NCAA: "College Football",
  NBA: "NBA",
  NHL: "NHL",
};

const prettyComp = (codeOrName) => {
  if (!codeOrName) return "—";
  if (COMP_NAMES[codeOrName]) return COMP_NAMES[codeOrName];
  if (/[a-z]/.test(codeOrName) || codeOrName.includes(" ")) return codeOrName;
  return codeOrName
    .split(/[_-]/g)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const logoUrl = (teamName) => `/logos/${slug(teamName)}.png`;

// route for each sport on click
const routeFor = (f) => {
  switch ((f.sport || "").toLowerCase()) {
    case "nba":
      return `/basketball/game/${f.id}`;
    case "nhl":
      return `/nhl/game/${f.id}`;
    case "cfb":
      return `/cfb/fixture/${f.id}`;
    case "nfl":
      return `/nfl`;
    default:
      return `/fixture/${f.id}`; // football
  }
};

// --- styles (inline so you can paste & go) ----------------------------------
const S = {
  page: { maxWidth: 980, margin: "0 auto", padding: 16 },
  headerRow: { display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" },
  select: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" },
  input: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc" },
  btn: { padding: "6px 10px", borderRadius: 6, border: "1px solid #ccc", background: "#fafafa", cursor: "pointer" },
  picksWrap: { background: "#0f5828", color: "#fff", borderRadius: 26, padding: 18, marginBottom: 20, boxShadow: "0 10px 24px rgba(0,0,0,.08)" },
  picksTitle: { fontWeight: 800, fontSize: 20, marginBottom: 8 },
  pickRow: { background: "#111", borderRadius: 12, padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, margin: "10px 0" },
  pickTeam: { display: "flex", alignItems: "center", gap: 8, fontWeight: 700 },
  pickTime: { fontWeight: 700, letterSpacing: 0.2 },
  pickSub: { fontSize: 12, opacity: 0.8, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginTop: 18, marginBottom: 8 },
  tbl: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #eee" },
  td: { padding: "8px 6px", borderBottom: "1px solid #f1f1f1" },
  muted: { color: "#777" },
};

export default function PublicDashboard() {
  const [day, setDay] = useState(todayISO());
  const [sport, setSport] = useState("all");
  const [loading, setLoading] = useState(false);
  const [fixtures, setFixtures] = useState([]);
  const [picks, setPicks] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      // fixtures
      const { data: fxJ } = await api.get("/api/public/fixtures/daily", {
        params: { day, sport },
      });

      // picks (best-effort)
      let pkJ = { picks: [] };
      try {
        const { data } = await api.get("/api/public/picks/daily", {
          params: { day, sport },
        });
        pkJ = data;
      } catch {}

      setFixtures(fxJ.fixtures || []);
      setPicks(pkJ.picks || []);
    } catch (e) {
      setErr(String(e?.message || e));
      setFixtures([]);
      setPicks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, sport]);

  const fixturesSorted = useMemo(
    () => [...fixtures].sort((a, b) => (a.kickoff_utc || "").localeCompare(b.kickoff_utc || "")),
    [fixtures]
  );

  const picksClean = useMemo(
    () =>
      (picks || []).map((p) => ({
        id: p.fixture_id ?? p.id,
        sport: p.sport || "football",
        comp: p.comp || "",
        home_team: p.home_team || p.home || "",
        away_team: p.away_team || p.away || "",
        kickoff_utc: p.kickoff_utc,
        market: p.market || "",
        price: p.price ?? p.odds ?? null,
        bookmaker: p.bookmaker || p.book || "",
        edge: p.edge ?? null,
        note: p.note || p.ai_note || "",
      })),
    [picks]
  );

  return (
    <div style={S.page}>
      {/* Controls */}
      <div style={S.headerRow}>
        <div style={{ fontWeight: 800, fontSize: 22 }}>Today’s Card</div>
        <div style={{ marginLeft: "auto" }} />
        <label>
          Day:&nbsp;
          <input style={S.input} type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>
          &nbsp;Sport:&nbsp;
          <select style={S.select} value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="all">All</option>
            <option value="football">Football</option>
            <option value="nba">NBA</option>
            <option value="nhl">NHL</option>
            <option value="nfl">NFL</option>
            <option value="cfb">CFB</option>
          </select>
        </label>
        <button style={S.btn} onClick={load}>Refresh</button>
      </div>

      {/* Featured Picks (big card) */}
    <div style={S.picksWrap}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={S.picksTitle}>
          Featured Picks {picksClean.length ? `(${picksClean.length})` : ""}
        </div>
        <FeaturedRecord span="30d" />
      </div>

      {picksClean.length === 0 ? (
        <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: 12, color: "#d7e6db" }}>
          No featured picks yet.
        </div>
      ) : (
        picksClean.map((p, i) => (
          <Link
            key={`${p.id}-${i}`}
            to={routeFor({ id: p.id, sport: p.sport })}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div style={S.pickRow}>
              <div style={S.pickTeam}>
                <img
                  src={logoUrl(p.home_team)}
                  alt=""
                  width={20}
                  height={20}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <span>{p.home_team}</span>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={S.pickTime}>{toUK(p.kickoff_utc, { withZone: true })}</div>
                <div style={{ fontSize: 11, opacity: 0.65, marginTop: 2 }}>
                  {prettyComp(p.comp || p.sport)}
                </div>
              </div>
              <div style={{ ...S.pickTeam, justifyContent: "flex-end" }}>
                <span>{p.away_team}</span>
                <img
                  src={logoUrl(p.away_team)}
                  alt=""
                  width={20}
                  height={20}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
              <div style={{ gridColumn: "1 / -1", ...S.pickSub }}>
                {p.market ? `Market: ${p.market}` : null}
                {p.price ? ` • Odds: ${Number(p.price).toFixed(2)}` : null}
                {p.bookmaker ? ` • Book: ${p.bookmaker}` : null}
                {p.edge != null ? ` • Edge: ${(Number(p.edge) * 100).toFixed(1)}%` : null}
                {p.note ? ` • ${p.note}` : null}
              </div>
            </div>
          </Link>
        ))
      )}
    </div>

    <AccaBlock day={day} />

      {/* Fixtures */}
      <div style={S.sectionTitle}>All Fixtures</div>
      {err && <p style={{ color: "#c00" }}>{err}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : fixturesSorted.length === 0 ? (
        <p style={S.muted}>No fixtures found.</p>
      ) : (
        <table style={S.tbl}>
          <thead>
            <tr>
              <th style={S.th}>Time (UK)</th>
              <th style={S.th}>Matchup</th>
              <th style={S.th}>Competition</th>
              <th style={S.th}>Sport</th>
            </tr>
          </thead>
          <tbody>
            {fixturesSorted.map((f) => (
              <tr key={f.id}>
                <td style={S.td}>{toUK(f.kickoff_utc)}</td>
                <td style={S.td}>
                  <Link to={routeFor(f)}>
                    <strong>{f.home_team}</strong> vs {f.away_team}
                  </Link>
                </td>
                <td style={S.td}>{prettyComp(f.comp)}</td>
                <td style={S.td}>{(f.sport || "").toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ ...S.muted, fontSize: 12, marginTop: 10 }}>
        Data updated live from Logie’s DB • API: {API_BASE}
      </div>
    </div>
  );
}

function AccaBlock({ day }) {
  const [accas, setAccas] = useState([]);
  useEffect(() => {
    api.get("/api/public/accas/daily", { params: { day } })
      .then(({ data }) => setAccas(data.accas || []))
      .catch(() => setAccas([]));
  }, [day]);

  if (!accas.length) return null;

  return (
    <div style={{ background: "#142a52", color: "#fff", borderRadius: 18, padding: 16, margin: "16px 0" }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Featured ACCAs</div>
      {accas.map((t) => (
        <div key={t.id} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 700 }}>
              {t.title || "ACCA"} • {t.legs?.length || 0} legs
            </div>
            <div>
              <b>Stake:</b> {t.stake_units}u • <b>Combined:</b> {t.combined_price?.toFixed(2)}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            {(t.legs || []).map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{l.matchup}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {prettyComp(l.comp)} • {toUK(l.kickoff_utc, { withZone: true })}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>{l.market}</div>
                <div style={{ textAlign: "right" }}>{l.price?.toFixed(2)} {l.bookmaker ? `(${l.bookmaker})` : ""}</div>
              </div>
            ))}
          </div>
          {t.note ? <div style={{ fontSize: 12, opacity: 0.85, marginTop: 6 }}>• {t.note}</div> : null}
        </div>
      ))}
    </div>
  );
}