// src/pages/AdminAddAcca.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

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

// -------- logos / helpers (same slug strategy as AdminPicks) ----------
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

/* ---------- player prop helpers (same vibe as AdminPicks) ---------- */

const PROP_TYPES = [
  { value: "shots", label: "Shots" },
  { value: "sot", label: "Shots on Target" },
  { value: "passes", label: "Passes" },
  { value: "tackles", label: "Tackles" },
  { value: "yellow", label: "Yellow Card" },
  { value: "goals_anytime", label: "Anytime Goalscorer" },
];

const PROP_TYPE_LABEL = {
  shots: "Shots",
  sot: "Shots on Target",
  passes: "Passes",
  tackles: "Tackles",
  yellow: "Yellow Cards",
  goals_anytime: "Anytime Goalscorer",
};

const buildPlayerPropMarketLabel = ({ player, type, line, side }) => {
  const playerName = (player || "").trim();
  const propType = type || "shots";
  const propLine = (line || "").trim();
  const propSide = side || "over";

  if (!playerName) {
    throw new Error("Please enter a player name for a player prop leg.");
  }
  if (!propType) {
    throw new Error("Please choose a prop type for a player prop leg.");
  }

  if (propType === "goals_anytime") {
    // Anytime goalscorer: no line/side required
    return `${playerName} - Anytime Goalscorer`;
  }

  if (!propLine) {
    throw new Error("Please enter a line (e.g. 0.5, 1.5) for the player prop.");
  }

  const typeLabel = PROP_TYPE_LABEL[propType] || propType;
  const sideWord = propSide === "under" ? "Under" : "Over";
  return `${playerName} - ${sideWord} ${propLine} ${typeLabel}`;
};

// Fractional "5/1" -> decimal 6.0 helper
const fractionToDecimal = (s) => {
  if (!s) throw new Error("Enter a target like 5/1");
  const parts = s.replace(/\s+/g, "").split("/");
  if (parts.length !== 2) throw new Error("Use fractional format like 5/1");
  const num = parseFloat(parts[0]);
  const den = parseFloat(parts[1]);
  if (!num || !den) throw new Error("Invalid fraction, e.g. 5/1, 4/1, 6/4");
  return num / den + 1.0;
};

export default function AdminAddAcca() {
  // Acca-level meta
  const [day, setDay] = useState(todayISO());
  const [sport, setSport] = useState("football");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [stakeUnits, setStakeUnits] = useState("1.0");
  const [isPublic, setIsPublic] = useState(true);

  // Fixtures
  const [fixtures, setFixtures] = useState([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);
  const [err, setErr] = useState("");

  // Legs in the acca
  const [legs, setLegs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState("");
  const [submitOk, setSubmitOk] = useState("");

  // 🔮 Auto-builder state
  const [autoTarget, setAutoTarget] = useState("5/1");
  const [autoLoading, setAutoLoading] = useState(false);
  const [autoErr, setAutoErr] = useState("");
  const [autoInfo, setAutoInfo] = useState("");

  const params = useMemo(
    () => ({ day, sport }),
    [day, sport]
  );

  const loadFixtures = async () => {
    setLoadingFixtures(true);
    setErr("");
    try {
      const res = await api.get("/api/public/fixtures/daily", { params });
      setFixtures(res.data?.fixtures || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || String(e));
      setFixtures([]);
    } finally {
      setLoadingFixtures(false);
    }
  };

  useEffect(() => {
    loadFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.day, params.sport]);

  const addLegFromForm = (fixture, form) => {
    const pickType = form.pick_type?.value || "match";

    let market = "";
    if (pickType === "player") {
      try {
        market = buildPlayerPropMarketLabel({
          player: form.player?.value,
          type: form.prop_type?.value,
          line: form.line?.value,
          side: form.side?.value,
        });
      } catch (e) {
        alert(e.message);
        return;
      }
    } else {
      market = (form.market.value || "").trim();
    }

    const bookmaker = (form.bookmaker.value || "").trim() || "bet365";
    const price = parseFloat(form.price.value);
    const legNote = (form.note.value || "").trim();

    if (!market) {
      alert("Market is required");
      return;
    }
    if (!price || isNaN(price)) {
      alert("Numeric decimal odds required");
      return;
    }

    const leg = {
      id: `${fixture.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fixture_id: fixture.id,
      fixture,
      sport,
      pickType,
      market,
      bookmaker,
      price,
      note: legNote || null,
    };

    setLegs((prev) => [...prev, leg]);
    form.reset();
  };

  const removeLeg = (legId) => {
    if (!window.confirm("Remove this leg from the acca?")) return;
    setLegs((prev) => prev.filter((l) => l.id !== legId));
  };

  const accaPrice = useMemo(() => {
    if (!legs.length) return null;
    const p = legs.reduce((prod, l) => prod * Number(l.price || 1), 1);
    if (!isFinite(p)) return null;
    return p;
  }, [legs]);

  const validateAcca = () => {
    if (!title.trim()) return "Title is required";
    if (!day) return "Day is required";
    if (!sport) return "Sport is required";
    if (!stakeUnits || isNaN(parseFloat(stakeUnits)))
      return "Stake units must be a number";
    if (!legs.length) return "Please add at least one leg to the acca.";
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      if (!l.fixture_id) return `Leg ${i + 1}: missing fixture id`;
      if (!l.market) return `Leg ${i + 1}: market is required`;
      if (!l.bookmaker) return `Leg ${i + 1}: bookmaker is required`;
      if (!l.price || isNaN(Number(l.price)))
        return `Leg ${i + 1}: price must be numeric`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitErr("");
    setSubmitOk("");

    const errMsg = validateAcca();
    if (errMsg) {
      setSubmitErr(errMsg);
      return;
    }

    const payload = {
      day,
      sport,
      title,
      note: note || null,
      stake_units: parseFloat(stakeUnits),
      is_public: isPublic,
      legs: legs.map((l) => ({
        fixture_id: l.fixture_id,
        market: l.market,
        bookmaker: l.bookmaker,
        price: Number(l.price),
        note: l.note || null,
      })),
    };

    try {
      setSubmitting(true);
      await api.post("/admin/accas/create", payload);
      setSubmitOk("Acca created successfully ✅");
      setSubmitErr("");
      // Reset just the acca and legs (keep day/sport)
      setTitle("");
      setNote("");
      setStakeUnits("1.0");
      setIsPublic(true);
      setLegs([]);
      setAutoInfo("");
    } catch (e2) {
      setSubmitErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.message ||
          e2.message ||
          "Acca creation failed"
      );
      setSubmitOk("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoBuild = async () => {
    setAutoErr("");
    setAutoInfo("");

    try {
      const targetDecimal = fractionToDecimal(autoTarget);
      setAutoLoading(true);

      const res = await api.post("/admin/accas/auto", {
        day,
        target_odds: targetDecimal,
        stake_units: parseFloat(stakeUnits) || 1.0,
        // NOTE: we *don't* send min_edge here,
        // so backend can work in pure odds mode.
      });

      const ticket = res.data?.ticket || {};
      const apiLegs = ticket.legs || [];

      if (!apiLegs.length) {
        throw new Error("Auto-builder returned no legs.");
      }

      // Map API legs -> local legs with faux fixture objects for UI
      const mapped = apiLegs.map((leg) => {
        const matchup = leg.matchup || "";
        const [home, away] = matchup.split(" vs ");
        return {
          id: `${leg.fixture_id}-${Math.random().toString(36).slice(2)}`,
          fixture_id: leg.fixture_id,
          fixture: {
            id: leg.fixture_id,
            home_team: home || "",
            away_team: away || "",
            comp: leg.comp || "",
            kickoff_utc: leg.kickoff_utc,
          },
          sport,
          pickType: "match",
          market: leg.market,
          bookmaker: leg.bookmaker,
          price: leg.price,
          note: leg.note || null,
        };
      });

      setLegs(mapped);

      if (!title) {
        setTitle(
          ticket.title ||
            `${autoTarget} Acca — ${day}`
        );
      }
      if (!note && ticket.note) {
        setNote(ticket.note);
      }

      const combined = ticket.combined_price || null;
      const explanation = ticket.explanation || "";
      setAutoInfo(
        `Built ${mapped.length}-leg acca ~${combined || "?"}x · ${explanation}`
      );
    } catch (e) {
      setAutoErr(
        e?.response?.data?.detail ||
          e?.message ||
          "Failed to auto-build acca."
      );
    } finally {
      setAutoLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin — Build Acca</h2>

      {/* ACCA META */}
      <form onSubmit={handleSubmit}>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 12,
            margin: "12px 0",
            display: "grid",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
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
                <option value="football">Football (Soccer)</option>
                <option value="nfl">NFL</option>
                <option value="cfb">CFB</option>
                <option value="nba">NBA</option>
                <option value="nhl">NHL</option>
              </select>
            </label>
            <label>
              Stake (units):&nbsp;
              <input
                type="number"
                step="0.1"
                value={stakeUnits}
                onChange={(e) => setStakeUnits(e.target.value)}
                style={{ width: 80 }}
              />
            </label>
            <label
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />{" "}
              Public
            </label>
          </div>

          {/* 🔮 Auto-build from model odds/edges */}
          <div
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 6,
              border: "1px dashed #d1d5db",
              background: "#f9fafb",
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              Auto-build from edges/odds
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontSize: 13 }}>Target price:</span>
              <input
                value={autoTarget}
                onChange={(e) => setAutoTarget(e.target.value)}
                placeholder="5/1"
                style={{ width: 70, padding: "3px 6px", fontSize: 13 }}
              />
              <span style={{ fontSize: 12, color: "#4b5563" }}>
                (e.g. 4/1, 5/1, 6/1)
              </span>
              <button
                type="button"
                onClick={handleAutoBuild}
                disabled={autoLoading}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #111827",
                  background: autoLoading ? "#e5e7eb" : "#111827",
                  color: "#fff",
                  cursor: autoLoading ? "default" : "pointer",
                  fontSize: 13,
                }}
              >
                {autoLoading ? "Building…" : "Auto-build acca"}
              </button>
            </div>

            {autoErr && (
              <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>
                {autoErr}
              </div>
            )}
            {autoInfo && (
              <div style={{ fontSize: 12, color: "#065f46", marginTop: 4 }}>
                {autoInfo}
              </div>
            )}
          </div>

          <div>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span>Title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Saturday Safe + Goals Acca ~6.66x"
              />
            </label>
          </div>

          <div>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <span>Acca Note (optional)</span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Safety-first accumulator using DNB/DC edges plus one high-value goals leg..."
              />
            </label>
          </div>

          {accaPrice && (
            <div style={{ fontSize: 13, color: "#111827" }}>
              Approx combined price:{" "}
              <strong>{accaPrice.toFixed(2)}x</strong>
            </div>
          )}

          {submitErr && (
            <div style={{ color: "#b91c1c", fontSize: 13 }}>{submitErr}</div>
          )}
          {submitOk && (
            <div style={{ color: "#15803d", fontSize: 13 }}>{submitOk}</div>
          )}

          <button
            type="submit"
            disabled={submitting || legs.length === 0}
            style={{
              marginTop: 4,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #111827",
              background: submitting ? "#e5e7eb" : "#111827",
              color: "#fff",
              cursor: submitting ? "default" : "pointer",
            }}
          >
            {submitting ? "Saving…" : "Create Acca"}
          </button>
        </div>
      </form>

      {/* CURRENT LEGS */}
      <h3>Acca Legs ({legs.length})</h3>
      {legs.length === 0 ? (
        <p style={{ color: "#666" }}>
          No legs added yet. Use the auto-builder above or the fixture table
          below to add legs.
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 8,
            marginBottom: 18,
          }}
        >
          {legs.map((l, idx) => (
            <div
              key={l.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontWeight: 600 }}>
                  Leg {idx + 1}:{" "}
                  <TeamChip name={l.fixture.home_team} />{" "}
                  <span style={{ color: "#666" }}>vs</span>{" "}
                  <TeamChip
                    name={l.fixture.away_team}
                    align="right"
                  />
                </div>
                <button
                  onClick={() => removeLeg(l.id)}
                  style={{
                    fontSize: 12,
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1px solid #dc2626",
                    color: "#dc2626",
                    background: "#fef2f2",
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
              <div style={{ fontSize: 13, marginBottom: 2 }}>
                <span style={{ color: "#4b5563" }}>Market:</span>{" "}
                <strong>{l.market}</strong>
              </div>
              <div style={{ fontSize: 13, marginBottom: 2 }}>
                <span style={{ color: "#4b5563" }}>Odds:</span>{" "}
                <strong>{Number(l.price).toFixed(2)}</strong> @{" "}
                {l.bookmaker}
              </div>
              {l.note && (
                <div style={{ fontSize: 13, marginTop: 2 }}>
                  <span style={{ color: "#4b5563" }}>Note:</span> {l.note}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* FIXTURES TABLE WITH "ADD LEG" FORMS */}
      <h3>Fixtures</h3>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 8,
          marginTop: 4,
        }}
      >
        <span style={{ fontSize: 13, color: "#4b5563" }}>
          Day and sport above control which fixtures appear here.
        </span>
        <button onClick={loadFixtures}>Refresh fixtures</button>
      </div>

      {err && <p style={{ color: "#c00" }}>{err}</p>}
      {loadingFixtures && <p>Loading fixtures…</p>}

      {fixtures.length === 0 ? (
        <p style={{ color: "#666" }}>No fixtures found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">UK Time</th>
              <th align="left">Matchup</th>
              <th align="left">Comp</th>
              <th align="left">Add Leg</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((f) => (
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
                  <div style={{ color: "#666", fontSize: 12 }}>
                    {f.comp}
                  </div>
                </td>
                <td>{f.comp}</td>
                <td>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      addLegFromForm(f, e.currentTarget);
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      {/* Pick type */}
                      <label
                        style={{
                          fontSize: 12,
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <span>Leg type</span>
                        <select name="pick_type" defaultValue="match">
                          <option value="match">Match market</option>
                          <option value="player">Player prop</option>
                        </select>
                      </label>

                      {/* Match market input */}
                      <input
                        name="market"
                        placeholder="Match market (e.g. HOME_WIN / O2.5)"
                      />

                      {/* Player prop fields */}
                      <div
                        style={{
                          border: "1px solid #e5e7eb",
                          borderRadius: 6,
                          padding: 6,
                          fontSize: 12,
                          background: "#f9fafb",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: 4,
                            fontWeight: 600,
                            fontSize: 11,
                          }}
                        >
                          Player prop (fill if leg type = Player)
                        </div>
                        <input
                          name="player"
                          placeholder="Player name (e.g. Bukayo Saka)"
                          style={{ marginBottom: 4 }}
                        />
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.3fr 0.7fr 0.7fr",
                            gap: 4,
                          }}
                        >
                          <select name="prop_type" defaultValue="shots">
                            {PROP_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <input
                            name="line"
                            placeholder="Line (e.g. 1.5)"
                          />
                          <select name="side" defaultValue="over">
                            <option value="over">Over</option>
                            <option value="under">Under</option>
                          </select>
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 10,
                            color: "#6b7280",
                          }}
                        >
                          For anytime goalscorer, line/side can be left
                          blank – it will be stored as{" "}
                          <em>"Player - Anytime Goalscorer"</em>.
                        </div>
                      </div>

                      <input name="bookmaker" placeholder="bet365" />
                      <input
                        name="price"
                        placeholder="1.95"
                        inputMode="decimal"
                      />
                      <input
                        name="note"
                        placeholder="Optional blurb…"
                      />
                      <button type="submit">Add leg</button>
                    </div>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}