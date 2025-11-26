// src/pages/AdminPicks.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api"; // ✅ env-based axios client

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

// -------- logos / helpers (same slug strategy as PublicDashboard) ----------
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

export default function AdminPicks() {
  // default to today + all so the API 422 never happens
  const [day, setDay] = useState(todayISO());
  const [sport, setSport] = useState("all");

  const [fixtures, setFixtures] = useState([]);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyPickId, setBusyPickId] = useState(null);
  const [err, setErr] = useState("");

  // per-row odds/edges cache + UI state
  const [expanded, setExpanded] = useState(null); // fixtureId | null
  const [detail, setDetail] = useState({}); // { [fixtureId]: { best_edges:[], odds:[] } }
  const [bookFilter, setBookFilter] = useState("all"); // filter inside expanded row

  const params = useMemo(
    () => ({ day, sport: sport || "all" }),
    [day, sport]
  );

  const loadAll = async () => {
    setLoading(true);
    setErr("");
    try {
      const [fRes, pRes] = await Promise.all([
        api.get("/api/public/fixtures/daily", { params }),
        api.get("/api/public/picks/daily", { params }),
      ]);
      setFixtures(fRes.data?.fixtures || []);
      setPicks(pRes.data?.picks || []);
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
      const r = await api.get(`/api/fixtures/id/${fixtureId}/json`);
      setDetail((d) => ({ ...d, [fixtureId]: r.data || {} }));
    } catch (e) {
      console.error("detail fetch failed", e);
      setDetail((d) => ({
        ...d,
        [fixtureId]: { error: String(e?.message || e) },
      }));
    }
  };

  // ----------------- ADD PICK (now uses /admin/picks & supports premium) ----
  const addPick = async (fixture, form) => {
    const market = form.market.value.trim();
    const bookmaker = form.bookmaker.value.trim() || "bet365";
    const price = parseFloat(form.price.value);
    const note = form.note.value.trim();
    const isPremiumOnly = form.is_premium_only?.checked || false;

    if (!market || !price || isNaN(price)) {
      alert("Market and numeric price required");
      return;
    }

    const payload = {
      day,
      fixture_id: fixture.id,
      sport: sport === "all" ? "football" : sport, // simple default
      market,
      bookmaker,
      price,
      edge: null,
      note: note || null,
      stake: 1.0,
      is_premium_only: isPremiumOnly,
    };

    setBusyPickId("adding");
    try {
      // Use your tested endpoint
      await api.post("/admin/picks", payload);
      form.reset();
      await loadAll();
    } catch (e) {
      alert("Add failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  // --------------- REMOVE PICK (keep your existing endpoint) ----------------
  const removePick = async (pickId) => {
    if (!window.confirm("Remove this pick?")) return;
    setBusyPickId(pickId);
    try {
      await api.post("/api/public/admin/picks/remove", null, {
        params: { pick_id: pickId },
      });
      await loadAll();
    } catch (e) {
      alert("Remove failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  // ---------------- SETTLE PICK (won / lost / void) -------------------------
  const settlePick = async (pickId, result) => {
    setBusyPickId(pickId);
    try {
      await api.post(`/admin/picks/${pickId}/settle`, null, {
        params: { result },
      });
      await loadAll();
    } catch (e) {
      alert("Settle failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  // ---------------- TOGGLE PREMIUM FLAG ------------------------------------
  const togglePremium = async (p, checked) => {
    const payload = {
      day,
      fixture_id: p.fixture_id,
      sport: p.sport || (sport === "all" ? "football" : sport),
      market: p.market,
      bookmaker: p.bookmaker,
      price: p.price,
      edge: p.edge ?? null,
      note: p.note ?? null,
      stake: p.stake ?? 1.0,
      is_premium_only: checked,
    };

    setBusyPickId(p.pick_id);
    try {
      await api.post("/admin/picks", payload);
      await loadAll();
    } catch (e) {
      alert("Premium toggle failed: " + (e?.response?.data?.detail || e.message));
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

  // -------- fixture lookup + robust resolver for pick display ------------
  const fixturesById = useMemo(() => {
    const m = {};
    for (const f of fixtures || []) m[Number(f.id)] = f;
    return m;
  }, [fixtures]);

  const resolvePickDisplay = (p) => {
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
    const s = splitMatchup(p.matchup || "");
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
      <h3 style={{ marginTop: 8 }}>Today’s Picks ({picks.length})</h3>
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
            const result = (p.result || "").toLowerCase();

            let resultLabel = "Not settled";
            let resultColor = "#666";
            if (result === "won") {
              resultLabel = "Won";
              resultColor = "#16a34a";
            } else if (result === "lost") {
              resultLabel = "Lost";
              resultColor = "#dc2626";
            } else if (result === "void") {
              resultLabel = "Void";
              resultColor = "#9ca3af";
            }

            return (
              <div
                key={p.pick_id}
                style={{
                  border: "1px solid #eee",
                  padding: 10,
                  borderRadius: 8,
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
                  <span style={{ color: "#666" }}>
                    ({p.comp || d.comp || "—"})
                  </span>
                </div>
                <div style={{ color: "#666" }}>
                  {fmtUK(d.ko || p.kickoff_utc)} •{" "}
                  {p.sport?.toUpperCase()}
                </div>
                <div>
                  Pick: <strong>{p.market}</strong> @ {p.bookmaker} —{" "}
                  <strong>{Number(p.price).toFixed(2)}</strong>
                </div>
                {p.note && (
                  <div style={{ marginTop: 4 }}>{p.note}</div>
                )}

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <span>
                    <span style={{ color: "#666" }}>Result:</span>{" "}
                    <span style={{ color: resultColor }}>
                      {resultLabel}
                    </span>
                  </span>

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!p.is_premium_only}
                      disabled={busyPickId === p.pick_id}
                      onChange={(e) =>
                        togglePremium(p, e.target.checked)
                      }
                    />{" "}
                    Premium only
                  </label>
                </div>

                <div
                  style={{
                    marginTop: 6,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    disabled={busyPickId === p.pick_id}
                    onClick={() => settlePick(p.pick_id, "won")}
                  >
                    Won
                  </button>
                  <button
                    disabled={busyPickId === p.pick_id}
                    onClick={() => settlePick(p.pick_id, "lost")}
                  >
                    Lost
                  </button>
                  <button
                    disabled={busyPickId === p.pick_id}
                    onClick={() => settlePick(p.pick_id, "void")}
                  >
                    Void
                  </button>

                  <button
                    disabled={busyPickId === p.pick_id}
                    onClick={() => removePick(p.pick_id)}
                  >
                    {busyPickId === p.pick_id
                      ? "Removing…"
                      : "Remove"}
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
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">UK Time</th>
              <th align="left">Matchup</th>
              <th align="left">Comp</th>
              <th align="left">Edges</th>
              <th align="left">Add Pick</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f) => {
              const attached = picksByFixture[f.id] || [];
              const d = detail[f.id] || {};
              const bestEdges = d.best_edges || [];
              const filteredEdges =
                bookFilter === "all"
                  ? bestEdges
                  : bestEdges.filter(
                      (e) =>
                        (e.bookmaker || "")
                          .toLowerCase() ===
                        bookFilter.toLowerCase()
                    );

              return (
                <tr
                  key={f.id}
                  style={{
                    borderBottom: "1px solid #eee",
                    verticalAlign: "top",
                  }}
                >
                  <td>{fmtUK(f.kickoff_utc)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      <TeamChip name={f.home_team} />{" "}
                      <span style={{ color: "#666" }}>vs</span>{" "}
                      <TeamChip name={f.away_team} align="right" />
                    </div>
                    <div
                      style={{
                        color: "#666",
                        fontSize: 12,
                      }}
                    >
                      {attached.length} pick(s)
                    </div>
                  </td>
                  <td>{f.comp}</td>

                  <td>
                    <button
                      onClick={() => onToggleExpand(f.id)}
                    >
                      {expanded === f.id ? "Hide" : "Show"} edges
                    </button>

                    {expanded === f.id && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: "#666",
                            }}
                          >
                            Book:
                          </span>
                          <select
                            value={bookFilter}
                            onChange={(e) =>
                              setBookFilter(e.target.value)
                            }
                            style={{ padding: 4 }}
                          >
                            <option value="all">All</option>
                            {Array.from(
                              new Set(
                                (d.odds || [])
                                  .map((o) =>
                                    (o.bookmaker || "")
                                      .toLowerCase()
                                  )
                                  .filter(Boolean)
                              )
                            ).map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>

                        {d.error ? (
                          <div style={{ color: "#c00" }}>
                            {d.error}
                          </div>
                        ) : filteredEdges.length === 0 ? (
                          <div style={{ color: "#666" }}>
                            No edges yet.
                          </div>
                        ) : (
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
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
                              {filteredEdges.map((e, i) => (
                                <tr key={i}>
                                  <td>{e.market}</td>
                                  <td align="right">
                                    {Number(
                                      e.price
                                    ).toFixed(2)}
                                  </td>
                                  <td align="right">
                                    {(
                                      Number(e.edge) * 100
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
                          placeholder="HOME_WIN / AWAY_WIN / O221.5"
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
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                          }}
                        >
                          <input
                            type="checkbox"
                            name="is_premium_only"
                          />{" "}
                          Premium
                        </label>
                        <button
                          disabled={busyPickId === "adding"}
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