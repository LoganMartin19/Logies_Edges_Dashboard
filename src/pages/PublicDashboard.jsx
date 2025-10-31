import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, API_BASE } from "../api";
import FeaturedRecord from "../components/FeaturedRecord";

// --- utils -------------------------------------------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);

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

const COMP_NAMES = {
  // Major European competitions
  UCL: "UEFA Champions League",
  UEL: "UEFA Europa League",
  UECL: "UEFA Europa Conference League",

  // England
  EPL: "Premier League",
  CHAMP: "EFL Championship",
  LG1: "EFL League One",
  LG2: "EFL League Two",
  ENG_FA: "FA Cup",
  ENG_EFL: "EFL Cup",

  // Scotland
  SCO_PREM: "Scottish Premiership",
  SCO_CHAMP: "Scottish Championship",

  // France
  LIGUE1: "Ligue 1",
  LIGUE2: "Ligue 2",

  // Germany
  BUNDES: "Bundesliga",
  BUNDES2: "2. Bundesliga",

  // Spain
  LA_LIGA: "La Liga",
  LA_LIGA2: "La Liga 2",

  // Italy
  SERIE_A: "Serie A",
  SERIE_B: "Serie B",

  // Portugal
  POR_LIGA: "Primeira Liga",

  // Belgium
  BEL_PRO: "Belgian Pro League",
  BEL_CUP: "Belgian Cup",

  // Brazil / South America
  BR_SERIE_A: "Brazil Serie A",
  BR_SERIE_B: "Brazil Serie B",
  ARG_LP: "Argentina Primera División",

  // USA
  MLS: "Major League Soccer",
  NFL: "NFL (American Football)",
  NBA: "NBA (Basketball)",
  NHL: "NHL (Hockey)",
  NCAA: "College Football",
  CFB: "College Football",

  // Others / fallback
  DEFAULT: "Football",
};

const prettyComp = (code) => COMP_NAMES[code] || code || "—";
const logoUrl = (teamName) => `/logos/${slug(teamName)}.png`;

const routeFor = (f) => {
  const s = (f.sport || "").toLowerCase();
  if (s === "nba") return `/basketball/game/${f.id}`;
  if (s === "nhl") return `/nhl/game/${f.id}`;
  if (s === "cfb") return `/cfb/fixture/${f.id}`;
  if (s === "nfl") return `/nfl`;
  return `/fixture/${f.id}`;
};

// responsive hook
const useIsMobile = (bp = 640) => {
  const [m, setM] = useState(() => (typeof window !== "undefined" ? window.innerWidth < bp : true));
  useEffect(() => {
    const fn = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return m;
};

// --- styles ------------------------------------------------------------
const S = {
  page: { maxWidth: 980, margin: "0 auto", padding: 16 },
  headerRow: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    background: "#fff",
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
    paddingBottom: 8,
    borderBottom: "1px solid rgba(0,0,0,.06)",
  },
  select: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" },
  btn: { padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fafafa", cursor: "pointer" },
  picksWrap: { background: "#0f5828", color: "#fff", borderRadius: 18, padding: 16, marginBottom: 20, boxShadow: "0 8px 20px rgba(0,0,0,.08)" },
  picksTitle: { fontWeight: 800, fontSize: 18, marginBottom: 8 },
  pickRow: { background: "#111", borderRadius: 12, padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, margin: "10px 0" },
  pickTeam: { display: "flex", alignItems: "center", gap: 8, fontWeight: 700 },
  pickSub: { fontSize: 12, opacity: 0.85, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginTop: 18, marginBottom: 8 },
  tbl: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #eee", fontSize: 14 },
  td: { padding: "10px 6px", borderBottom: "1px solid #f1f1f1", fontSize: 14 },
  muted: { color: "#777" },
  pillRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 },
  pill: (active) => ({
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid " + (active ? "#111" : "#ddd"),
    background: active ? "#111" : "#fff",
    color: active ? "#fff" : "#111",
    whiteSpace: "nowrap",
    cursor: "pointer",
    fontSize: 13,
  }),
};

// mobile card style
const mobile = {
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 6,
  },
  comp: { fontSize: 12, color: "#666", marginTop: 4 },
};

// --- Sub components ----------------------------------------------------
const TeamChip = ({ name, align = "left" }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    {align === "left" && <img loading="lazy" src={logoUrl(name)} alt="" width={18} height={18} onError={(e) => (e.currentTarget.style.display = "none")} />}
    <b style={{ fontWeight: 700 }}>{name}</b>
    {align === "right" && <img loading="lazy" src={logoUrl(name)} alt="" width={18} height={18} onError={(e) => (e.currentTarget.style.display = "none")} />}
  </span>
);

const FixtureCard = ({ f }) => (
  <Link to={routeFor(f)} style={{ textDecoration: "none", color: "inherit" }}>
    <div style={mobile.card}>
      <div style={mobile.row}>
        <div>
          <div style={{ fontSize: 16, lineHeight: 1.25 }}>
            <TeamChip name={f.home_team} /> <span style={{ opacity: 0.6 }}>vs</span> <TeamChip name={f.away_team} align="right" />
          </div>
          <div style={mobile.comp}>{prettyComp(f.comp)} • {(f.sport || "").toUpperCase()}</div>
        </div>
        <div style={{ textAlign: "right", minWidth: 70 }}>
          <div style={{ fontWeight: 800 }}>{toUK(f.kickoff_utc)}</div>
          <div style={{ fontSize: 12, color: "#777" }}>{toUK(f.kickoff_utc, { withZone: true }).split(" ").slice(-1)[0]}</div>
        </div>
      </div>
    </div>
  </Link>
);

// ACCA block
function AccaBlock({ day }) {
  const [accas, setAccas] = useState([]);
  useEffect(() => {
    api
      .get("api/api/public/accas/daily", { params: { day } })
      .then(({ data }) => setAccas(data.accas || []))
      .catch(() => setAccas([]));
  }, [day]);

  if (!accas.length) return null;

  return (
    <div style={{ background: "#142a52", color: "#fff", borderRadius: 18, padding: 16, margin: "16px 0" }}>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Featured ACCAs</div>
      {accas.map((t) => (
        <div key={t.id} style={{ background: "rgba(255,255,255,.06)", borderRadius: 12, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700 }}>
              {t.title || "ACCA"} • {t.legs?.length || 0} legs
            </div>
            <div style={{ fontSize: 14 }}>
              <b>Stake:</b> {t.stake_units}u • <b>Combined:</b> {t.combined_price?.toFixed(2)}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            {(t.legs || []).map((l, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{l.matchup}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {prettyComp(l.comp)} • {toUK(l.kickoff_utc, { withZone: true })}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>{l.market}</div>
                <div style={{ textAlign: "right" }}>
                  {l.price?.toFixed(2)} {l.bookmaker ? `(${l.bookmaker})` : ""}
                </div>
              </div>
            ))}
          </div>
          {t.note ? <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>• {t.note}</div> : null}
        </div>
      ))}
    </div>
  );
}

// --- main page ---------------------------------------------------------
export default function PublicDashboard() {
  const [day, setDay] = useState(todayISO());
  const [sport, setSport] = useState("all");
  const [loading, setLoading] = useState(false);
  const [fixtures, setFixtures] = useState([]);
  const [picks, setPicks] = useState([]);
  const [err, setErr] = useState("");
  const isMobile = useIsMobile(700);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const { data: fxJ } = await api.get("/api/public/fixtures/daily", { params: { day, sport } });
      let pkJ = { picks: [] };
      try {
        const { data } = await api.get("/public/picks", { params: { day } });
        pkJ = data;
      } catch {
        try {
          const { data } = await api.get("/api/public/picks/daily", { params: { day, sport } });
          pkJ = data;
        } catch {}
      }
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

  useEffect(() => { load(); }, [day, sport]);

  const fixturesSorted = useMemo(
    () => [...fixtures].sort((a, b) => (a.kickoff_utc || "").localeCompare(b.kickoff_utc || "")),
    [fixtures]
  );

  const sportOptions = ["all", "football", "nba", "nhl", "nfl", "cfb"];

  return (
    <div style={S.page}>
      {/* Header controls */}
      <div style={S.headerRow}>
        <div style={{ fontWeight: 800, fontSize: 22 }}>Today’s Card</div>
        <div style={{ marginLeft: "auto" }} />
        <label>
          Day:&nbsp;
          <input style={S.input} type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        {!isMobile && (
          <label>
            &nbsp;Sport:&nbsp;
            <select style={S.select} value={sport} onChange={(e) => setSport(e.target.value)}>
              {sportOptions.map((s) => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>
          </label>
        )}
        <button style={S.btn} onClick={load}>Refresh</button>
        {isMobile && (
          <div style={{ width: "100%" }}>
            <div style={S.pillRow}>
              {sportOptions.map((s) => (
                <button key={s} onClick={() => setSport(s)} style={S.pill(sport === s)}>
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Picks */}
      <div style={S.picksWrap}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
          <div style={S.picksTitle}>Featured Picks</div>
          <FeaturedRecord span="30d" />
        </div>
        {picks.length === 0 ? (
          <div style={{ background: "rgba(255,255,255,.08)", borderRadius: 12, padding: 12, color: "#d7e6db" }}>
            No featured picks yet.
          </div>
        ) : (
          picks.map((p, i) => (
            <Link key={i} to={routeFor({ id: p.fixture_id ?? p.id, sport: p.sport })} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={S.pickRow}>
                <div style={S.pickTeam}><img src={logoUrl(p.home_team)} width={20} alt="" onError={(e)=>e.currentTarget.style.display="none"}/> {p.home_team}</div>
                <div style={{ textAlign: "center" }}>
                  <div>{toUK(p.kickoff_utc, { withZone: true })}</div>
                  <div style={{ fontSize: 11, opacity: 0.75 }}>{prettyComp(p.comp)}</div>
                </div>
                <div style={{ ...S.pickTeam, justifyContent: "flex-end" }}>{p.away_team} <img src={logoUrl(p.away_team)} width={20} alt="" onError={(e)=>e.currentTarget.style.display="none"}/></div>
                <div style={{ gridColumn: "1 / -1", ...S.pickSub }}>{p.market} • {p.bookmaker} • {p.edge && `${(p.edge*100).toFixed(1)}%`}</div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* ACCAs */}
      <AccaBlock day={day} />

      {/* Fixtures */}
      <div style={S.sectionTitle}>All Fixtures</div>
      {err && <p style={{ color: "#c00" }}>{err}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : fixturesSorted.length === 0 ? (
        <p style={S.muted}>No fixtures found.</p>
      ) : isMobile ? (
        fixturesSorted.map((f) => <FixtureCard key={f.id} f={f} />)
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
                    <TeamChip name={f.home_team} /> <span style={{ opacity: 0.6 }}>vs</span> <TeamChip name={f.away_team} align="right" />
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