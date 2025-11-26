// src/pages/AdminPicks.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api"; // axios client with /api base

const todayISO = () => new Date().toISOString().slice(0, 10);

// British local time formatter (BST/GMT)
const fmtUK = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (!isNaN(d)) {
      return d.toLocaleString("en-GB", {
        timeZone: "Europe/London",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
    }
  } catch {}
  try {
    const d2 = new Date(
      iso.endsWith("Z") || iso.includes("+") ? iso : iso + "Z"
    );
    if (!isNaN(d2)) {
      return d2.toLocaleString("en-GB", {
        timeZone: "Europe/London",
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      });
    }
  } catch {}
  return iso;
};

// -------- logos / helpers ----------
const slug = (s = "") =>
  s
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toLowerCase();

const logoUrl = (teamName) => `/logos/${slug(teamName)}.png`;

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

// parse "A v B" or "A vs B"
const splitMatchup = (s = "") => {
  const m = s.split(/\s+v(?:s\.)?\s+/i);
  return m.length === 2 ? { home: m[0].trim(), away: m[1].trim() } : {};
};

// --- result badge + mapping ---------------------------------
const ResultBadge = ({ result }) => {
  if (!result) {
    return (
      <span
        style={{
          display: "inline-flex",
          padding: "2px 8px",
          borderRadius: 999,
          fontSize: 12,
          background: "#263238",
          color: "#e0e0e0",
        }}
      >
        —
      </span>
    );
  }
  const base = {
    display: "inline-flex",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
  };
  const r = result.toLowerCase();
  let style = { ...base };
  if (r === "won") {
    style.background = "#124b27";
    style.color = "#b6f2c6";
  } else if (r === "lost") {
    style.background = "#4b1212";
    style.color = "#f2b6b6";
  } else if (r === "void") {
    style.background = "#3b3b3b";
    style.color = "#f5f5f5";
  }
  return <span style={style}>{r.toUpperCase()}</span>;
};

const RESULT_OPTIONS = ["WIN", "LOSE", "PUSH", "VOID"];

const toApiResult = (uiResult) => {
  switch (uiResult) {
    case "WIN":
      return "won";
    case "LOSE":
      return "lost";
    case "VOID":
      return "void";
    case "PUSH":
      // backend only supports won|lost|void, treat push as void
      return "void";
    default:
      return "";
  }
};

// map UI sport select → backend `sport` param for /admin/picks/fixtures
const toApiSport = (v) => {
  switch (v) {
    case "football":
      return "soccer";
    default:
      return v || "all";
  }
};

export default function AdminPicks() {
  const [day, setDay] = useState(todayISO());
  const [sport, setSport] = useState("all");

  const [fixtures, setFixtures] = useState([]);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyPickId, setBusyPickId] = useState(null);
  const [err, setErr] = useState("");

  // edges + odds detail cache
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState({});
  const [bookFilter, setBookFilter] = useState("all");

  const params = useMemo(
    () => ({ day, sport: toApiSport(sport) }),
    [day, sport]
  );

  const loadAll = async () => {
    setLoading(true);
    setErr("");
    try {
      // fixtures from /api/admin/picks/fixtures
      const [fRes, pRes] = await Promise.all([
        api.get("/api/admin/picks/fixtures", { params }),
        api.get("/api/admin/picks", { params: { day } }),
      ]);

      const fx = fRes.data?.fixtures || [];
      setFixtures(
        fx.map((f) => ({
          id: f.id,
          home_team: f.home,
          away_team: f.away,
          comp: f.comp,
          kickoff_utc: f.kickoff_utc,
        }))
      );

      const rows = pRes.data?.picks || [];
      setPicks(
        rows.map((r) => ({
          ...r,
          // normalise nested fixture into same shape we use elsewhere
          fixture_home: r.fixture?.home || null,
          fixture_away: r.fixture?.away || null,
          fixture_comp: r.fixture?.comp || null,
          fixture_ko: r.fixture?.ko || null,
        }))
      );
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || String(e));
      setFixtures([]);
      setPicks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.day, params.sport]);

  const ensureDetail = async (fixtureId) => {
    if (detail[fixtureId]) return;
    try {
      // same fixture JSON endpoint you already use elsewhere
      const r = await api.get(`/api/fixtures/${fixtureId}`);
      setDetail((d) => ({ ...d, [fixtureId]: r.data || {} }));
    } catch (e) {
      console.error("detail fetch failed", e);
      setDetail((d) => ({
        ...d,
        [fixtureId]: { error: String(e?.message || e) },
      }));
    }
  };

  const addPick = async (fixture, form) => {
    const market = form.market.value.trim();
    const bookmaker = form.bookmaker.value.trim() || "bet365";
    const price = parseFloat(form.price.value);
    const note = form.note.value.trim();
    const sportGuess = (fixture.sport || "football").toLowerCase();

    if (!market || !price || isNaN(price)) {
      alert("Market and numeric price required");
      return;
    }

    const payload = {
      day,
      fixture_id: fixture.id,
      sport: sportGuess,
      market,
      bookmaker,
      price,
      edge: null,
      note: note || null,
      stake: 1.0,
      is_premium_only: false,
    };

    setBusyPickId("adding");
    try {
      await api.post("/api/admin/picks", payload);
      form.reset();
      await loadAll();
    } catch (e) {
      alert("Add failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  const removePick = async (pickId) => {
    if (!window.confirm("Remove this pick?")) return;
    setBusyPickId(pickId);
    try {
      await api.delete(`/api/admin/picks/${pickId}`);
      await loadAll();
    } catch (e) {
      alert("Remove failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  const settlePick = async (pickId, uiResult) => {
    const result = toApiResult(uiResult);
    if (!result) return;
    setBusyPickId(pickId);
    try {
      await api.post(`/api/admin/picks/${pickId}/settle`, null, {
        params: { result },
      });
      await loadAll();
    } catch (e) {
      alert("Settle failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  const picksByFixture = useMemo(() => {
    const map = {};
    for (const p of picks) {
      if (!map[p.fixture_id]) map[p.fixture_id] = [];
      map[p.fixture_id].push(p);
    }
    return map;
  }, [picks]);

  const onToggleExpand = async (fid) => {
    const next = expanded === fid ? null : fid;
    setExpanded(next);
    if (next) await ensureDetail(next);
  };

  const fixturesById = useMemo(() => {
    const m = {};
    for (const f of fixtures || []) m[Number(f.id)] = f;
    return m;
  }, [fixtures]);

  const resolvePickDisplay = (p) => {
    // prefer nested fixture from /admin/picks
    if (p.fixture_home || p.fixture_away || p.fixture_comp || p.fixture_ko) {
      return {
        home: p.fixture_home,
        away: p.fixture_away,
        comp: p.fixture_comp,
        ko: p.fixture_ko,
      };
    }

    const fx = fixturesById[Number(p.fixture_id)];
    const fromPick = {
      home: p.home_team,
      away: p.away_team,
      comp: p.comp,
      ko: p.kickoff_utc,
    };
    if (fromPick.home && fromPick.away) return fromPick;
    if (fx) {
      return {
        home: fx.home_team,
        away: fx.away_team,
        comp: fx.comp || fromPick.comp,
        ko: fx.kickoff_utc || fromPick.ko,
      };
    }
    const s = splitMatchup(p.match || "");
    return {
      home: s.home || fromPick.home,
      away: s.away || fromPick.away,
      comp: fromPick.comp || "Football",
      ko: fromPick.ko,
    };
  };

  const PrefillBtn = ({ f, mkt, book, price }) => (
    <button
      style={{ fontSize: 12, padding: "2px 6px" }}
      onClick={() => {
        const form = document.getElementById(`pick-form-${f.id}`);
        if (!form) return;
        form.market.value = mkt || "";
        form.bookmaker.value = book || "";
        form.price.value =
          price != null ? Number(price).toFixed(2) : "";
        form.note.focus();
      }}
    >
      Use
    </button>
  );

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin — Featured Picks</h2>

      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <label>
          Day:&nbsp;
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </label>
        <label>
          Sport:&nbsp;
          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
          >
            <option value="all">All</option>
            <option value="football">Football (Soccer)</option>
            <option value="nfl">NFL</option>
            <option value="nhl">NHL</option>
            <option value="nba">NBA</option>
            <option value="cfb">CFB</option>
          </select>
        </label>
        <button onClick={loadAll}>Refresh</button>
      </div>

      {err && <p style={{ color: "#c00" }}>{err}</p>}
      {loading ? <p>Loading…</p> : null}

      {/* Current picks */}
      <h3 style={{ marginTop: 8 }}>
        Today’s Picks ({picks.length})
      </h3>
      {picks.length === 0 ? (
        <p style={{ color: "#666" }}>No picks yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 10,
            marginBottom: 18,
          }}
        >
          {picks.map((p) => {
            const d = resolvePickDisplay(p);
            const isBusy = busyPickId === p.id;
            return (
              <div
                key={p.id}
                style={{
                  border: "1px solid #28313f",
                  padding: 10,
                  borderRadius: 8,
                  background: "#050810",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <TeamChip name={d.home || "—"} />{" "}
                  <span style={{ color: "#666" }}>vs</span>{" "}
                  <TeamChip name={d.away || "—"} align="right" />
                  <span style={{ color: "#888" }}>
                    ({d.comp || p.comp || "—"})
                  </span>
                </div>
                <div style={{ color: "#aaa", fontSize: 13 }}>
                  {fmtUK(d.ko || p.kickoff_utc)} •{" "}
                  {(p.sport || "football").toUpperCase()}
                </div>
                <div style={{ marginTop: 2 }}>
                  Pick: <strong>{p.market}</strong> @ {p.bookmaker} —{" "}
                  <strong>
                    {p.price != null
                      ? Number(p.price).toFixed(2)
                      : "—"}
                  </strong>
                </div>
                {p.note && (
                  <div style={{ marginTop: 4 }}>{p.note}</div>
                )}

                {/* result row */}
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#aaa" }}>
                    Result:
                  </span>
                  <ResultBadge result={p.result} />
                </div>

                {/* settle + remove buttons */}
                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {RESULT_OPTIONS.map((r) => (
                    <button
                      key={r}
                      disabled={isBusy}
                      onClick={() => settlePick(p.id, r)}
                      style={{
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "none",
                        fontSize: 12,
                        cursor: isBusy ? "default" : "pointer",
                        background:
                          r === "WIN"
                            ? "#124b27"
                            : r === "LOSE"
                            ? "#4b1212"
                            : "#3b3b3b",
                        color: "#f9fafb",
                      }}
                    >
                      {r}
                    </button>
                  ))}

                  <button
                    disabled={isBusy}
                    onClick={() => removePick(p.id)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: 12,
                      cursor: isBusy ? "default" : "pointer",
                      background: "#a52727",
                      color: "#fff",
                      marginLeft: "auto",
                    }}
                  >
                    {isBusy ? "Working…" : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Fixture list with quick add */}
      <h3>Fixtures</h3>
      {fixtures.length === 0 ? (
        <p>No fixtures found.</p>
      ) : (
        <table
          style={{ width: "100%", borderCollapse: "collapse" }}
        >
          <thead>
            <tr>
              <th align="left">UK Time</th>
              <th align="left">Matchup</th>
              <th align="left">Comp</th>
              <th align="left">Add Pick</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f) => {
              const attached = picksByFixture[f.id] || [];
              return (
                <tr
                  key={f.id}
                  style={{
                    borderBottom: "1px solid #28313f",
                    verticalAlign: "top",
                  }}
                >
                  <td>{fmtUK(f.kickoff_utc)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      <TeamChip name={f.home_team} />{" "}
                      <span style={{ color: "#666" }}>vs</span>{" "}
                      <TeamChip
                        name={f.away_team}
                        align="right"
                      />
                    </div>
                    <div
                      style={{
                        color: "#666",
                        fontSize: 12,
                      }}
                    >
                      {attached.length} pick(s)
                    </div>
                    <button
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        padding: "2px 6px",
                      }}
                      onClick={() => onToggleExpand(f.id)}
                    >
                      {expanded === f.id ? "Hide edges" : "Show edges"}
                    </button>

                    {expanded === f.id && (
                      <div style={{ marginTop: 8 }}>
                        {detail[f.id]?.error ? (
                          <div style={{ color: "#c00" }}>
                            {detail[f.id].error}
                          </div>
                        ) : !detail[f.id]?.edges ||
                          detail[f.id].edges.length === 0 ? (
                          <div style={{ color: "#666" }}>
                            No edges cached for this fixture.
                          </div>
                        ) : (
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              fontSize: 12,
                            }}
                          >
                            <thead>
                              <tr>
                                <th align="left">Market</th>
                                <th align="right">Odds</th>
                                <th align="right">Edge</th>
                                <th align="left">Book</th>
                                <th align="left">—</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detail[f.id].edges.map((e, i) => (
                                <tr key={i}>
                                  <td>{e.market}</td>
                                  <td align="right">
                                    {Number(
                                      e.price
                                    ).toFixed(2)}
                                  </td>
                                  <td align="right">
                                    {(
                                      Number(e.edge) *
                                      100
                                    ).toFixed(1)}
                                    %
                                  </td>
                                  <td>{e.bookmaker}</td>
                                  <td>
                                    <PrefillBtn
                                      f={f}
                                      mkt={e.market}
                                      book={e.bookmaker}
                                      price={e.price}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </td>
                  <td>{f.comp}</td>
                  <td>
                    <form
                      id={`pick-form-${f.id}`}
                      onSubmit={(e) => {
                        e.preventDefault();
                        addPick(f, e.currentTarget);
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <input
                          name="market"
                          placeholder="HOME_WIN / AWAY_WIN / O2.5"
                        />
                        <input
                          name="bookmaker"
                          placeholder="bet365"
                        />
                        <input
                          name="price"
                          placeholder="1.95"
                          inputMode="decimal"
                        />
                        <input
                          name="note"
                          placeholder="Optional blurb…"
                        />
                        <button
                          disabled={
                            busyPickId === "adding"
                          }
                          type="submit"
                        >
                          {busyPickId === "adding"
                            ? "Adding…"
                            : "Add"}
                        </button>
                      </div>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}