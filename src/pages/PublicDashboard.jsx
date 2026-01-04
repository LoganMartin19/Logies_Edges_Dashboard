// src/pages/PublicDashboard.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, fetchFixtureEdges } from "../api";
import FeaturedRecord from "../components/FeaturedRecord";
import { useAuth } from "../components/AuthGate";
import { placeAndTrackEdge } from "../utils/placeAndTrack";
import PremiumUpsellBanner from "../components/PremiumUpsellBanner";
import { getBookmakerUrl } from "../utils/bookmakers";
import FixtureAccessPill from "../components/FixtureAccessPill";
import { usePreferences } from "../context/PreferencesContext";

/* ---------------- utils ---------------- */
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
  s
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();

const COMP_NAMES = {
  UCL: "UEFA Champions League",
  UEL: "UEFA Europa League",
  UECL: "UEFA Europa Conference League",
  EPL: "Premier League",
  CHAMP: "EFL Championship",
  LG1: "EFL League One",
  LG2: "EFL League Two",
  ENG_FA: "FA Cup",
  ENG_EFL: "EFL Cup",
  SCO_PREM: "Scottish Premiership",
  SCO_CHAMP: "Scottish Championship",
  SCO_1: "Scottish League One",
  SCO_2: "Scottish League Two",
  SCO_SC: "Scottish Cup",
  SCO_LC: "Scottish League Cup",
  SCO_CHAL: "Scottish Challenge Cup",
  LIGUE1: "Ligue 1",
  LIGUE2: "Ligue 2",
  FRA_CDF: "Coupe de France",
  BUNDES: "Bundesliga",
  BUNDES2: "2. Bundesliga",
  GER_POKAL: "DFB-Pokal",
  LA_LIGA: "La Liga",
  LA_LIGA2: "La Liga 2",
  SERIE_A: "Serie A",
  SERIE_B: "Serie B",
  ITA_COPPA: "Coppa Italia",
  POR_LIGA: "Primeira Liga",
  POR_TACA: "Taça de Portugal",
  DEN_SL: "Danish Superliga",
  DEN_CUP: "Danish Cup",
  NED_ERED: "Eredivisie",
  NED_EERST: "Eerste Divisie",
  NED_KNVB: "KNVB Cup",
  BEL_PRO: "Belgian Pro League",
  BEL_CUP: "Belgian Cup",
  NOR_ELI: "Eliteserien",
  NOR_CUP: "Norwegian Cup",
  SWE_ALLSV: "Allsvenskan",
  SWE_SUPER: "Superettan",
  SWE_CUP: "Swedish Cup",
  BR_SERIE_A: "Brazil Serie A",
  BR_SERIE_B: "Brazil Serie B",
  ARG_LP: "Argentina Primera División",
  MLS: "Major League Soccer",
  NFL: "NFL (American Football)",
  NBA: "NBA (Basketball)",
  NHL: "NHL (Hockey)",
  NCAA: "College Football",
  CFB: "College Football",
  WCQ_EUR: "World Cup Qualifiers (Europe)",
  DEFAULT: "Football",
};

const prettyComp = (code) => COMP_NAMES[code] || code || "—";
const logoUrl = (team) => `/logos/${slug(team)}.png`;

const routeFor = (f) => {
  const s = (f.sport || "").toLowerCase();
  if (s === "nba") return `/basketball/game/${f.id}`;
  if (s === "nhl") return `/nhl/game/${f.id}`;
  if (s === "cfb") return `/cfb/fixture/${f.id}`;
  if (s === "nfl") return `/nfl`;
  return `/fixture/${f.id}`;
};

const normBook = (x) =>
  String(x || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const isWilliamHill = (bm) => normBook(bm) === "williamhill";

/* ----------- responsive hook ---------- */
const useIsMobile = (bp = 640) => {
  const [m, setM] = useState(
    () => (typeof window !== "undefined" ? window.innerWidth < bp : true)
  );
  useEffect(() => {
    const fn = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, [bp]);
  return m;
};

/* ---------------- styles -------------- */
const S = {
  page: { maxWidth: 980, margin: "0 auto", padding: 16 },
  headerRow: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    background: "#0b1e13",
    display: "flex",
    gap: 8,
    alignItems: "center",
    marginBottom: 14,
    flexWrap: "wrap",
    paddingBottom: 8,
    borderBottom: "1px solid rgba(255,255,255,.1)",
    color: "#fff",
  },
  select: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" },
  input: { padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" },
  btn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    background: "#fafafa",
    cursor: "pointer",
  },
  picksWrap: {
    background: "#0f5828",
    color: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    boxShadow: "0 8px 20px rgba(0,0,0,.08)",
  },
  picksTitle: { fontWeight: 800, fontSize: 18, marginBottom: 8 },
  pickRow: {
    background: "#111",
    borderRadius: 12,
    padding: "10px 12px",
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: 8,
    margin: "10px 0",
  },
  pickTeam: { display: "flex", alignItems: "center", gap: 8, fontWeight: 700 },
  pickSub: { fontSize: 12, opacity: 0.85, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 700, marginTop: 18, marginBottom: 8 },

  tbl: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "8px 6px",
    borderBottom: "1px solid rgba(255,255,255,.12)",
    fontSize: 14,
    color: "#eaf4ed",
    background: "rgba(255,255,255,.06)",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "10px 6px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    fontSize: 14,
    color: "#eaf4ed",
    verticalAlign: "middle",
  },

  muted: { color: "rgba(255,255,255,.7)" },
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
  picksActions: { textAlign: "center", marginTop: 8 },

  smallCard: {
    background: "#0b1e13",
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    border: "1px solid rgba(255,255,255,.08)",
  },

  filterRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
  },
  tiny: { fontSize: 12, opacity: 0.85 },
};

const mobile = {
  card: {
    background: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    boxShadow: "0 1px 3px rgba(0,0,0,.06)",
    color: "#0f1f14",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    alignItems: "center",
    gap: 6,
  },
  comp: { fontSize: 12, color: "#5f6b66", marginTop: 4 },
  sub: { marginTop: 8, display: "flex", justifyContent: "space-between", gap: 8 },
};

/* ------------- sub components ---------- */
const TeamChip = ({ name, align = "left" }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    {align === "left" && (
      <img
        loading="lazy"
        src={logoUrl(name)}
        alt=""
        width={18}
        height={18}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    )}
    <b style={{ fontWeight: 700 }}>{name}</b>
    {align === "right" && (
      <img
        loading="lazy"
        src={logoUrl(name)}
        alt=""
        width={18}
        height={18}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    )}
  </span>
);

/* -------------------- ACCA block ------------------- */
function AccaBlock({ day }) {
  const { user } = useAuth();
  const [accas, setAccas] = useState([]);
  const [trackingAccaId, setTrackingAccaId] = useState(null);
  const [trackedAccaIds, setTrackedAccaIds] = useState([]);

  useEffect(() => {
    api
      .get("api/public/accas/daily", { params: { day } })
      .then(({ data }) => setAccas(data.accas || []))
      .catch(() => setAccas([]));
  }, [day]);

  const handleTrackAcca = async (t) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    try {
      setTrackingAccaId(t.id);
      const stake = Number(t.stake_units ?? 1);

      await placeAndTrackEdge(
        {
          fixture_id: null,
          market: t.title || "ACCA",
          bookmaker: "ACCA",
          price: Number(t.combined_price),
        },
        {
          stake,
          sourceTipsterId: t.tipster_id || null,
        }
      );

      setTrackedAccaIds((prev) => (prev.includes(t.id) ? prev : [...prev, t.id]));
    } catch (e) {
      console.error("Failed to track acca", e);
      alert("Could not add this ACCA to your bet tracker.");
    } finally {
      setTrackingAccaId(null);
    }
  };

  if (!accas.length) return null;

  return (
    <div
      style={{
        background: "#142a52",
        color: "#fff",
        borderRadius: 18,
        padding: 16,
        margin: "16px 0",
      }}
    >
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
        Featured ACCAs
      </div>
      {accas.map((t) => (
        <div
          key={t.id}
          style={{
            background: "rgba(255,255,255,.06)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <div style={{ fontWeight: 700 }}>
              {t.title || "ACCA"} • {t.legs?.length || 0} legs
            </div>
            <div style={{ fontSize: 14 }}>
              <b>Stake:</b> {t.stake_units}u • <b>Combined:</b>{" "}
              {t.combined_price?.toFixed(2)}
            </div>
          </div>

          <div style={{ marginTop: 8 }}>
            {(t.legs || []).map((l, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  gap: 8,
                  padding: "6px 0",
                  borderBottom: "1px solid rgba(255,255,255,.08)",
                }}
              >
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

          {t.note ? (
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6 }}>• {t.note}</div>
          ) : null}

          <div style={{ marginTop: 8, textAlign: "right" }}>
            {user ? (
              <button
                style={{ ...S.btn, fontSize: 12, padding: "6px 10px" }}
                onClick={() => handleTrackAcca(t)}
                disabled={trackingAccaId === t.id}
              >
                {trackingAccaId === t.id
                  ? "Tracking…"
                  : trackedAccaIds.includes(t.id)
                  ? "Tracked ✓"
                  : "Track this ACCA"}
              </button>
            ) : (
              <Link
                to="/login"
                style={{ fontSize: 12, color: "#9be7ff", textDecoration: "none" }}
              >
                Log in to track →
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* --------------------- main page ------------------- */
export default function PublicDashboard() {
  const { user, isPremium } = useAuth();
  const { favoriteSports, favoriteTeams, favoriteLeagues } = usePreferences();

  const [day, setDay] = useState(todayISO());
  const [sport, setSport] = useState("all");
  const [loading, setLoading] = useState(false);
  const [fixtures, setFixtures] = useState([]);
  const [picks, setPicks] = useState([]);
  const [err, setErr] = useState("");
  const [showAll, setShowAll] = useState(false);

  const [followingFeed, setFollowingFeed] = useState([]);
  const [followingErr, setFollowingErr] = useState("");

  const isMobile = useIsMobile(700);

  const [trackingPickKey, setTrackingPickKey] = useState(null);
  const [trackedPickKeys, setTrackedPickKeys] = useState([]);

  // NEW: All vs Favourites toggle
  const [showFavsOnly, setShowFavsOnly] = useState(false);

  // NEW: sorting + min edge
  const [sortMode, setSortMode] = useState("kickoff"); // "kickoff" | "top_edge"
  const [minEdgePct, setMinEdgePct] = useState(0); // percent, e.g. 5 = 5%

  // NEW: top edge cache (per fixture)
  // { [fixtureId]: { edge, market, bookmaker, isTeaser, hasFullAccess } | null }
  const [topEdgeByFixture, setTopEdgeByFixture] = useState({});
  const [topEdgeLoading, setTopEdgeLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const [{ data: fxJ }, { data: pkJ }] = await Promise.all([
        api.get("/api/public/fixtures/daily", { params: { day, sport } }),
        api.get("/api/public/picks/daily", { params: { day, sport, limit: 50 } }),
      ]);

      setFixtures(fxJ?.fixtures || []);
      setPicks(pkJ?.picks || []);
    } catch (e) {
      setErr(String(e?.response?.data?.detail || e.message || e));
      setFixtures([]);
      setPicks([]);
    } finally {
      setLoading(false);
    }
  }, [day, sport]);

  useEffect(() => {
    load();
  }, [load]);

  // Following mini feed
  useEffect(() => {
    if (!user) {
      setFollowingFeed([]);
      setFollowingErr("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/api/tipsters/following/feed", {
          params: { limit: 5 },
        });
        if (!cancelled) {
          const rows = Array.isArray(data) ? data : data.picks || [];
          setFollowingFeed(rows);
          setFollowingErr("");
        }
      } catch (e) {
        if (e?.response?.status === 401) {
          if (!cancelled) {
            setFollowingFeed([]);
            setFollowingErr("");
          }
        } else if (!cancelled) {
          setFollowingErr("Could not load your following feed.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // helper: does this fixture match user's favourites?
  const isFavFixture = useCallback(
    (f) => {
      const sportKey = (f.sport || "").toLowerCase();
      const favSportsSet = new Set((favoriteSports || []).map((s) => (s || "").toLowerCase()));
      const favLeaguesSet = new Set(favoriteLeagues || []);
      const favTeamsSet = new Set(favoriteTeams || []);

      if (favSportsSet.has(sportKey)) return true;
      if (favLeaguesSet.has(f.comp)) return true;
      if (favTeamsSet.has(f.home_team) || favTeamsSet.has(f.away_team)) return true;
      return false;
    },
    [favoriteSports, favoriteTeams, favoriteLeagues]
  );

  // favourites-first base ordering
  const fixturesSorted = useMemo(() => {
    if (!fixtures.length) return [];
    return [...fixtures].sort((a, b) => {
      const aFav = isFavFixture(a);
      const bFav = isFavFixture(b);
      if (aFav !== bFav) return aFav ? -1 : 1;
      return (a.kickoff_utc || "").localeCompare(b.kickoff_utc || "");
    });
  }, [fixtures, isFavFixture]);

  const fixturesToShowBase = useMemo(() => {
    if (!showFavsOnly) return fixturesSorted;
    return fixturesSorted.filter((f) => isFavFixture(f));
  }, [fixturesSorted, showFavsOnly, isFavFixture]);

  // ---------------- Top edge selection (mirrors FixturePage gating) ----------------
  const pickDisplayTopEdge = useCallback((json) => {
    // json is fixture/{id}/edges response
    const full = Array.isArray(json?.edges) ? json.edges : null;
    const teaser = Array.isArray(json?.edges_teaser) ? json.edges_teaser : null;

    const hasFullAccess = !!(json?.is_premium || json?.has_access);
    const isTeaser = !hasFullAccess;

    const list = hasFullAccess ? full || [] : teaser || [];
    if (!list.length) return null;

    // always exclude williamhill
    const filtered = list.filter((e) => !isWilliamHill(e?.bookmaker));
    const chosen = filtered[0] || null; // best for premium/unlocked, "worst-of-best" for teaser (because teaser list is worst-first)
    if (!chosen) return null;

    return {
      market: chosen.market,
      bookmaker: chosen.bookmaker,
      edge: typeof chosen.edge === "number" ? chosen.edge : null,
      prob: typeof chosen.prob === "number" ? chosen.prob : null,
      price: typeof chosen.price === "number" ? chosen.price : null,
      isTeaser,
      hasFullAccess,
    };
  }, []);

  // Lightweight concurrency runner
  const runWithLimit = async (items, limit, fn) => {
    const res = [];
    let idx = 0;
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
      while (idx < items.length) {
        const cur = items[idx++];
        try {
          res.push(await fn(cur));
        } catch {
          res.push(null);
        }
      }
    });
    await Promise.all(workers);
    return res;
  };

  // load top edges for visible fixtures (cap for speed)
  useEffect(() => {
    let cancelled = false;

    const ids = fixturesToShowBase.map((f) => Number(f.id)).filter(Boolean);

    // only fetch for first N to keep it snappy (table scroll)
    const MAX_FETCH = 60;
    const want = ids.slice(0, MAX_FETCH).filter((fid) => topEdgeByFixture[fid] === undefined);

    if (!want.length) return;

    (async () => {
      setTopEdgeLoading(true);
      try {
        await runWithLimit(
          want,
          6,
          async (fid) => {
            const json = await fetchFixtureEdges(fid);
            const picked = pickDisplayTopEdge(json);
            if (!cancelled) {
              setTopEdgeByFixture((prev) => ({ ...prev, [fid]: picked }));
            }
            return true;
          }
        );
      } finally {
        if (!cancelled) setTopEdgeLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fixturesToShowBase, topEdgeByFixture, pickDisplayTopEdge]);

  // Apply min edge threshold to fixtures (based on displayed Top Edge)
  const minEdge = Number(minEdgePct || 0) / 100;

  const fixturesFiltered = useMemo(() => {
    if (!fixturesToShowBase.length) return [];
    if (!minEdge) return fixturesToShowBase;

    return fixturesToShowBase.filter((f) => {
      const te = topEdgeByFixture[Number(f.id)];
      if (!te || typeof te.edge !== "number") return false; // if we don't know yet, hide under filter
      return te.edge >= minEdge;
    });
  }, [fixturesToShowBase, topEdgeByFixture, minEdge]);

  // Sort fixtures by kickoff or top edge
  const fixturesFinal = useMemo(() => {
    const arr = [...fixturesFiltered];

    if (sortMode === "top_edge") {
      arr.sort((a, b) => {
        const ae = topEdgeByFixture[Number(a.id)];
        const be = topEdgeByFixture[Number(b.id)];
        const av = typeof ae?.edge === "number" ? ae.edge : -999;
        const bv = typeof be?.edge === "number" ? be.edge : -999;
        if (bv !== av) return bv - av; // higher edge first
        return (a.kickoff_utc || "").localeCompare(b.kickoff_utc || "");
      });
      return arr;
    }

    // default kickoff (already favourites-first from base)
    arr.sort((a, b) => (a.kickoff_utc || "").localeCompare(b.kickoff_utc || ""));
    // re-apply favourites-first stable
    arr.sort((a, b) => {
      const aFav = isFavFixture(a);
      const bFav = isFavFixture(b);
      if (aFav !== bFav) return aFav ? -1 : 1;
      return 0;
    });
    return arr;
  }, [fixturesFiltered, sortMode, topEdgeByFixture, isFavFixture]);

  const fixturesById = useMemo(() => {
    const m = {};
    for (const f of fixtures) m[Number(f.id)] = f;
    return m;
  }, [fixtures]);

  const splitMatchup = (s = "") => {
    const m = s.split(/\s+v(?:s\.)?\s+/i);
    return m.length === 2 ? { home: m[0].trim(), away: m[1].trim() } : {};
  };

  const resolvePick = (p) => {
    const fx = fixturesById[Number(p.fixture_id ?? p.id)];
    if (fx)
      return {
        fixture_id: fx.id,
        home: fx.home_team,
        away: fx.away_team,
        comp: fx.comp,
        ko: fx.kickoff_utc,
        sport: fx.sport || p.sport,
      };
    const parsed = splitMatchup(p.matchup || "");
    return {
      fixture_id: p.fixture_id ?? p.id,
      home: p.home_team || parsed.home || "—",
      away: p.away_team || parsed.away || "—",
      comp: p.comp || "Football",
      ko: p.kickoff_utc,
      sport: p.sport,
    };
  };

  const sportOptions = ["all", "football", "nba", "nhl", "nfl", "cfb"];
  const shown = showAll ? picks : picks.slice(0, 3);

  const handleTrackPick = async (p, resolvedPick, pickKey, evt) => {
    if (evt) {
      evt.preventDefault();
      evt.stopPropagation();
    }

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const bmUrl = getBookmakerUrl(p.bookmaker);
    const openUrl = bmUrl
      ? bmUrl
      : "https://google.com/search?q=" + encodeURIComponent(p.bookmaker || "bet365");

    window.open(openUrl, "_blank", "noopener");

    try {
      setTrackingPickKey(pickKey);
      const stake = Number(p.stake ?? 1);

      await placeAndTrackEdge(
        {
          fixture_id: Number(resolvedPick.fixture_id) || null,
          market: p.market,
          bookmaker: p.bookmaker || null,
          price: Number(p.price),
        },
        { stake, sourceTipsterId: p.tipster_id || null }
      );

      setTrackedPickKeys((prev) => (prev.includes(pickKey) ? prev : [...prev, pickKey]));
    } catch (e) {
      console.error("Failed to track featured pick", e);
      alert("Could not add this pick to your bet tracker.");
    } finally {
      setTrackingPickKey(null);
    }
  };

  const renderTopEdgeCell = (f) => {
    const te = topEdgeByFixture[Number(f.id)];

    if (te === undefined) {
      return (
        <span style={{ opacity: 0.7 }}>
          {topEdgeLoading ? "Loading…" : "—"}
        </span>
      );
    }
    if (!te) return <span style={{ opacity: 0.7 }}>—</span>;

    const pct =
      typeof te.edge === "number" ? `${(te.edge * 100).toFixed(1)}%` : "—";

    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <b>{pct}</b>
        <span style={{ opacity: 0.9 }}>{te.market}</span>
        <span style={{ opacity: 0.8 }}>•</span>
        <span style={{ opacity: 0.95 }}>{te.bookmaker}</span>

        {te.isTeaser && (
          <span
            style={{
              padding: "2px 6px",
              borderRadius: 999,
              border: "1px solid rgba(251,191,36,0.7)",
              color: "#FBBF24",
              fontSize: 11,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
            title="Free preview: upgrade/unlock to see the true best edge"
          >
            🔒 Preview
          </span>
        )}
      </span>
    );
  };

  return (
    <div style={S.page}>
      {/* Header controls */}
      <div style={S.headerRow}>
        <div style={{ fontWeight: 800, fontSize: 22 }}>Today’s Card</div>
        <div style={{ marginLeft: "auto" }} />

        <label>
          Day:&nbsp;
          <input
            style={S.input}
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setTopEdgeByFixture({}); // reset cache when day changes
            }}
          />
        </label>

        {!isMobile && (
          <label>
            &nbsp;Sport:&nbsp;
            <select
              style={S.select}
              value={sport}
              onChange={(e) => {
                setSport(e.target.value);
                setTopEdgeByFixture({});
              }}
            >
              {sportOptions.map((s) => (
                <option key={s} value={s}>
                  {s.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
        )}

        <button style={S.btn} onClick={load}>
          Refresh
        </button>

        {isMobile && (
          <div style={{ width: "100%" }}>
            <div style={S.pillRow}>
              {sportOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSport(s);
                    setTopEdgeByFixture({});
                  }}
                  style={S.pill(sport === s)}
                >
                  {s.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ⭐ Premium Upsell Banner */}
      <PremiumUpsellBanner
        mode="link"
        message="Go Premium to unlock full CSB model edges, extra featured picks, and deeper stats across today’s card."
      />

      {/* Featured Picks */}
      <div style={S.picksWrap}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={S.picksTitle}>Featured Picks</div>
          <FeaturedRecord span="30d" />
        </div>

        {picks.length === 0 ? (
          <div
            style={{
              background: "rgba(255,255,255,.08)",
              borderRadius: 12,
              padding: 12,
              color: "#d7e6db",
            }}
          >
            No featured picks yet.
          </div>
        ) : (
          <>
            {shown.map((p, i) => {
              const d = resolvePick(p);
              const pickKey = `${day}_${sport}_${i}`;
              const tracked = trackedPickKeys.includes(pickKey);
              const tracking = trackingPickKey === pickKey;

              return (
                <Link
                  key={i}
                  to={routeFor({ id: d.fixture_id, sport: d.sport })}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div style={S.pickRow}>
                    <div style={S.pickTeam}>
                      <img
                        src={logoUrl(d.home)}
                        width={20}
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />{" "}
                      {d.home}
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <div>{toUK(d.ko, { withZone: true })}</div>
                      <div style={{ fontSize: 11, opacity: 0.75 }}>
                        {prettyComp(d.comp)}
                      </div>
                    </div>

                    <div style={{ ...S.pickTeam, justifyContent: "flex-end" }}>
                      {d.away}{" "}
                      <img
                        src={logoUrl(d.away)}
                        width={20}
                        alt=""
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    </div>

                    <div
                      style={{
                        gridColumn: "1 / -1",
                        ...S.pickSub,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {p.market}
                        {p.is_premium_only && (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 999,
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(251,191,36,0.7)",
                              color: "#FBBF24",
                              fontSize: 11,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            🔒 Premium
                          </span>
                        )}
                        {" • "}
                        {p.bookmaker}
                        {" • "}
                        {p.edge && `${(p.edge * 100).toFixed(1)}%`}
                      </span>

                      {user && (
                        <button
                          type="button"
                          style={{ ...S.btn, fontSize: 12, padding: "4px 10px" }}
                          onClick={(evt) => handleTrackPick(p, d, pickKey, evt)}
                          disabled={tracking}
                        >
                          {tracking ? "Tracking…" : tracked ? "Tracked ✓" : "Track"}
                        </button>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}

            {picks.length > 3 && (
              <div style={S.picksActions}>
                <button style={S.btn} onClick={() => setShowAll((s) => !s)}>
                  {showAll ? "Show less" : `Show all (${picks.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Following mini feed */}
      <div style={S.smallCard}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>From tipsters you follow</div>
          <div style={{ marginLeft: "auto", fontSize: 12 }}>
            <Link to="/following" style={{ color: "#9be7ff", textDecoration: "none" }}>
              View full feed →
            </Link>
          </div>
        </div>

        {!user && (
          <div style={{ fontSize: 13, color: "#d7e6db" }}>
            <Link to="/login" style={{ color: "#9be7ff", textDecoration: "none" }}>
              Log in
            </Link>{" "}
            to see picks from tipsters you follow.
          </div>
        )}

        {user && followingErr && (
          <div style={{ fontSize: 13, color: "#ffb3b3" }}>{followingErr}</div>
        )}

        {user && !followingErr && followingFeed.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...S.tbl, marginTop: 4 }}>
              <thead>
                <tr>
                  <th style={S.th}>Tipster</th>
                  <th style={S.th}>Fixture</th>
                  <th style={S.th}>Market</th>
                  <th style={S.th}>Bookmaker</th>
                  <th style={S.th}>Odds</th>
                  <th style={S.th}>Stake</th>
                  <th style={S.th}>Result</th>
                  <th style={{ ...S.th, textAlign: "right" }}>Profit</th>
                </tr>
              </thead>
              <tbody>
                {followingFeed.map((p) => {
                  const locked = p.is_premium_only && !isPremium;

                  return (
                    <tr key={p.id}>
                      <td style={S.td}>
                        <Link
                          to={`/tipsters/${p.tipster_username}`}
                          style={{ color: "#9be7ff", textDecoration: "none" }}
                        >
                          {p.tipster_name || p.tipster_username}
                        </Link>
                      </td>
                      <td style={S.td}>{p.fixture_label}</td>

                      <td style={S.td}>
                        {locked ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                            <span style={{ opacity: 0.9 }}>Premium pick</span>
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: 999,
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(251,191,36,0.7)",
                                color: "#FBBF24",
                                fontSize: 10,
                              }}
                            >
                              🔒
                            </span>
                            <Link
                              to="/premium"
                              style={{ color: "#FBBF24", textDecoration: "underline", fontSize: 11 }}
                            >
                              Unlock +
                            </Link>
                          </span>
                        ) : (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {p.market}
                            {p.is_premium_only && (
                              <span
                                style={{
                                  padding: "2px 6px",
                                  borderRadius: 999,
                                  background: "rgba(255,255,255,0.06)",
                                  border: "1px solid rgba(251,191,36,0.7)",
                                  color: "#FBBF24",
                                  fontSize: 10,
                                }}
                              >
                                🔒
                              </span>
                            )}
                          </span>
                        )}
                      </td>

                      <td style={S.td}>{locked ? "—" : p.bookmaker || "—"}</td>
                      <td style={S.td}>{locked ? "—" : p.price?.toFixed?.(2) ?? p.price ?? "—"}</td>
                      <td style={S.td}>{locked ? "—" : p.stake ?? 1}</td>
                      <td style={S.td}>{locked ? "—" : p.result || "—"}</td>

                      <td
                        style={{
                          ...S.td,
                          textAlign: "right",
                          color: locked ? "#eaf4ed" : (p.profit ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                        }}
                      >
                        {locked ? "—" : typeof p.profit === "number" ? p.profit.toFixed(2) : "0.00"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACCAs */}
      <AccaBlock day={day} />

      {/* Fixtures header + toggle + filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 8 }}>
        <div style={S.sectionTitle}>All Fixtures</div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button type="button" style={S.pill(!showFavsOnly)} onClick={() => setShowFavsOnly(false)}>
            All
          </button>
          <button type="button" style={S.pill(showFavsOnly)} onClick={() => setShowFavsOnly(true)}>
            Favourites
          </button>
        </div>
      </div>

      {/* Sort + Min edge filters */}
      <div style={{ ...S.smallCard, marginTop: 0 }}>
        <div style={S.filterRow}>
          <label style={S.tiny}>
            Sort:&nbsp;
            <select
              style={{ ...S.select, padding: "6px 10px" }}
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value)}
            >
              <option value="kickoff">Kickoff</option>
              <option value="top_edge">Top edge</option>
            </select>
          </label>

          <label style={S.tiny}>
            Min edge %:&nbsp;
            <input
              style={{ ...S.input, padding: "6px 10px", width: 90 }}
              type="number"
              min={0}
              step={0.5}
              value={minEdgePct}
              onChange={(e) => setMinEdgePct(e.target.value)}
            />
          </label>

          <div style={{ marginLeft: "auto", fontSize: 12, opacity: 0.85 }}>
            {topEdgeLoading ? "Calculating top edges…" : ""}
            <span style={{ marginLeft: 8, opacity: 0.8 }}>
              (WilliamHill auto-hidden)
            </span>
          </div>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
          Premium users see the true best edge. Free users may see a preview edge until they unlock the fixture or go Premium.
        </div>
      </div>

      {err && <p style={{ color: "#c00" }}>{err}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : !fixtures.length ? (
        <p style={S.muted}>No fixtures found.</p>
      ) : showFavsOnly && !fixturesFinal.length ? (
        <p style={S.muted}>
          No fixtures match your favourites yet. Add favourite teams/leagues on your Account page or from a fixture.
        </p>
      ) : isMobile ? (
        fixturesFinal.map((f) => {
          const te = topEdgeByFixture[Number(f.id)];
          return (
            <div key={f.id} style={{ marginBottom: 12 }}>
              <div style={mobile.card}>
                <Link to={routeFor(f)} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={mobile.row}>
                    <div>
                      <div style={{ fontSize: 16, lineHeight: 1.25, color: "#0f1f14" }}>
                        <TeamChip name={f.home_team} />{" "}
                        <span style={{ opacity: 0.6, color: "#444" }}>vs</span>{" "}
                        <TeamChip name={f.away_team} align="right" />
                      </div>
                      <div style={mobile.comp}>
                        {prettyComp(f.comp)} • {(f.sport || "").toUpperCase()}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 62 }}>
                      <div style={{ fontWeight: 700, color: "#0f1f14" }}>{toUK(f.kickoff_utc)}</div>
                      <div style={{ fontSize: 11, color: "#7a847f" }}>
                        {toUK(f.kickoff_utc, { withZone: true }).split(" ").slice(-1)[0]}
                      </div>
                    </div>
                  </div>

                  <div style={mobile.sub}>
                    <div style={{ fontSize: 12, color: "#2b3a34" }}>
                      <b>Top edge:</b>{" "}
                      {te && typeof te.edge === "number"
                        ? `${(te.edge * 100).toFixed(1)}% • ${te.market} • ${te.bookmaker}`
                        : te === undefined
                        ? "Loading…"
                        : "—"}
                      {te?.isTeaser ? (
                        <span style={{ marginLeft: 6, color: "#b45309" }}>🔒</span>
                      ) : null}
                    </div>
                    {te?.isTeaser ? (
                      <Link to="/premium" style={{ fontSize: 12, color: "#b45309", textDecoration: "underline" }}>
                        Upgrade →
                      </Link>
                    ) : null}
                  </div>
                </Link>

                <div style={{ marginTop: 8 }}>
                  <FixtureAccessPill variant="compact" fixtureId={f.id} />
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <table style={S.tbl}>
          <thead>
            <tr>
              <th style={S.th}>Time (UK)</th>
              <th style={S.th}>Matchup</th>
              <th style={S.th}>Competition</th>
              <th style={S.th}>Sport</th>
              <th style={S.th}>Top Edge</th>
              <th style={S.th}>Access</th>
            </tr>
          </thead>
          <tbody>
            {fixturesFinal.map((f) => (
              <tr key={f.id}>
                <td style={S.td}>{toUK(f.kickoff_utc)}</td>
                <td style={S.td}>
                  <Link to={routeFor(f)} style={{ color: "#d7e6db", textDecoration: "none" }}>
                    <TeamChip name={f.home_team} />{" "}
                    <span style={{ opacity: 0.6 }}>vs</span>{" "}
                    <TeamChip name={f.away_team} align="right" />
                  </Link>
                </td>
                <td style={S.td}>{prettyComp(f.comp)}</td>
                <td style={S.td}>{(f.sport || "").toUpperCase()}</td>

                <td style={S.td}>
                  {renderTopEdgeCell(f)}
                  {topEdgeByFixture[Number(f.id)]?.isTeaser && (
                    <span style={{ marginLeft: 10 }}>
                      <Link to="/premium" style={{ color: "#FBBF24", textDecoration: "underline", fontSize: 12 }}>
                        See best →
                      </Link>
                    </span>
                  )}
                </td>

                <td style={S.td}>
                  <FixtureAccessPill variant="compact" fixtureId={f.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}