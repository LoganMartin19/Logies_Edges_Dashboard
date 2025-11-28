// src/pages/TipsterAddAcca.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { fetchDailyFixtures, createTipsterAcca } from "../api";

const todayStr = () => new Date().toISOString().slice(0, 10);

// --- same prop set as TipsterAddPick ---
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

// Canonical match markets (same base list as TipsterAddPick)
const MATCH_MARKETS = [
  { value: "HOME_WIN", label: "1X2 – Home Win" },
  { value: "DRAW", label: "1X2 – Draw" },
  { value: "AWAY_WIN", label: "1X2 – Away Win" },

  { value: "BTTS_Y", label: "BTTS – Yes" },
  { value: "BTTS_N", label: "BTTS – No" },

  { value: "O2.5", label: "Goals – Over 2.5" },
  { value: "U2.5", label: "Goals – Under 2.5" },

  // ⭐ Double Chance
  { value: "DC_1X", label: "Double Chance – 1X (Home or Draw)" },
  { value: "DC_12", label: "Double Chance – 12 (Home or Away)" },
  { value: "DC_X2", label: "Double Chance – X2 (Draw or Away)" },

  // ⭐ Draw No Bet
  { value: "DNB_H", label: "Draw No Bet – Home" },
  { value: "DNB_A", label: "Draw No Bet – Away" },

  // “Families” that need extra detail text
  { value: "HANDICAP", label: "Handicap / Asian Handicap" },
  { value: "CORNERS", label: "Corners" },
  { value: "CARDS", label: "Cards / Bookings" },
  { value: "OTHER", label: "Other Market" },
];

const DETAIL_MARKETS = new Set(["HANDICAP", "CORNERS", "CARDS", "OTHER"]);

// Build the readable market label for a player prop leg
const buildPlayerPropMarketLabel = (leg) => {
  const player = (leg.player || "").trim();
  const type = leg.type;
  const line = (leg.line || "").trim();
  const side = leg.side || "over";

  if (!player) {
    throw new Error("Please enter a player name for each player prop leg.");
  }
  if (!type) {
    throw new Error(
      "Please choose a player prop type for each player prop leg."
    );
  }

  if (type === "goals_anytime") {
    // Anytime goalscorer: no line/side required
    return `${player} - Anytime Goalscorer`;
  }

  if (!line) {
    throw new Error(
      "Please enter a line (e.g. 0.5, 1.5) for each player prop leg."
    );
  }

  const typeLabel = PROP_TYPE_LABEL[type] || type;
  const sideWord = side === "under" ? "Under" : "Over";
  return `${player} - ${sideWord} ${line} ${typeLabel}`;
};

export default function TipsterAddAcca() {
  const { username } = useParams();
  const nav = useNavigate();

  const [day, setDay] = useState(todayStr());
  const [sport, setSport] = useState("football");
  const [fixtures, setFixtures] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stake, setStake] = useState(1.0);

  // visibility flags
  const [isPremium, setIsPremium] = useState(false);
  const [isSubscriberOnly, setIsSubscriberOnly] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // -------- fixture formatting helpers --------
  const normalizeFixtures = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.fixtures)) return data.fixtures;
    if (Array.isArray(data.rows)) return data.rows;
    return [];
  };

  const fmtTime = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const fmtDate = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleDateString([], { day: "2-digit", month: "short" });
  };

  const formatFixtureLabel = (fx) => {
    const h = fx.home_team ?? fx.home_name ?? "Home";
    const a = fx.away_team ?? fx.away_name ?? "Away";
    return `${fmtDate(fx.kickoff_utc)} · ${fmtTime(
      fx.kickoff_utc
    )} — ${h} vs ${a}`;
  };

  // -------- load fixtures --------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const res = await fetchDailyFixtures(day, sport);
        if (!mounted) return;
        const list = normalizeFixtures(res);
        setFixtures(list);
      } catch (e) {
        if (!mounted) return;
        setErr(
          e?.response?.data?.detail || e.message || "Failed to load fixtures"
        );
        setFixtures([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [day, sport]);

  // -------- add/remove legs --------
  const addLeg = (fx) => {
    const h = fx.home_team ?? fx.home_name ?? "Home";
    const a = fx.away_team ?? fx.away_name ?? "Away";
    setLegs((prev) => [
      ...prev,
      {
        fixture_id: fx.id,
        home_name: h,
        away_name: a,

        // match market fields
        market: "HOME_WIN", // canonical family code
        marketDetail: "", // extra text for handicap/corners/cards/other
        price: 2.0,
        bookmaker: "bet365",

        // new: player prop fields
        legType: "match", // "match" | "player"
        player: "",
        type: "shots",
        line: "",
        side: "over",
      },
    ]);
  };

  const rmLeg = (i) => setLegs((prev) => prev.filter((_, idx) => idx !== i));

  const combined = useMemo(
    () => legs.reduce((acc, l) => acc * (parseFloat(l.price) || 1), 1),
    [legs]
  );

  // -------- submit --------
  const submit = async (e) => {
    e.preventDefault();
    try {
      setErr("");

      if (legs.length < 2) throw new Error("Acca needs at least 2 legs");

      // Build final legs with correct market strings
      const finalLegs = legs.map((l, idx) => {
        if (!l.fixture_id) {
          throw new Error(`Leg ${idx + 1} is missing a fixture.`);
        }

        let marketToSend = (l.market || "").trim();

        if (l.legType === "player") {
          // Player prop: build nice readable label
          marketToSend = buildPlayerPropMarketLabel(l);
        } else {
          // Match market: append detail where appropriate
          const detail = (l.marketDetail || "").trim();
          if (DETAIL_MARKETS.has(l.market) && detail) {
            marketToSend = `${marketToSend} - ${detail}`;
          }
        }

        if (!marketToSend) {
          throw new Error(`Leg ${idx + 1} is missing a market.`);
        }

        const priceNum = Number(l.price);
        if (!priceNum || Number.isNaN(priceNum)) {
          throw new Error(
            `Please enter valid decimal odds for leg ${idx + 1}.`
          );
        }

        return {
          fixture_id: Number(l.fixture_id),
          market: marketToSend,
          price: priceNum,
          bookmaker: (l.bookmaker || "").trim() || null,
          note: null,
        };
      });

      await createTipsterAcca(username, {
        stake_units: parseFloat(stake) || 1,
        is_premium_only: !!isPremium,
        is_subscriber_only: !!isSubscriberOnly,
        legs: finalLegs,
      });

      nav(`/tipsters/${username}`);
    } catch (e2) {
      setErr(
        e2?.response?.data?.detail || e2.message || "Failed to create acca"
      );
    }
  };

  // helpers to update leg fields
  const updateLegField = (index, field, value) => {
    setLegs((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const isDetailMarket = (m) => DETAIL_MARKETS.has(m);

  return (
    <div style={{ maxWidth: 820, padding: 16 }}>
      <Link to={`/tipsters/${username}`}>← Back</Link>
      <h2 style={{ marginTop: 4 }}>New Acca for @{username}</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, margin: "12px 0 20px" }}>
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
            <option value="football">Football</option>
            <option value="nba">NBA</option>
            <option value="nhl">NHL</option>
            <option value="nfl">NFL</option>
            <option value="cfb">CFB</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div>Loading fixtures…</div>
      ) : (
        <>
          <div style={{ marginBottom: 8, opacity: 0.7 }}>
            Fixtures found: <strong>{fixtures.length}</strong>
          </div>

          {/* fixtures list */}
          <div style={{ display: "grid", gap: 8 }}>
            {fixtures.map((fx) => (
              <div
                key={fx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "#0c331f",
                  padding: 8,
                  borderRadius: 8,
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 600 }}>{formatFixtureLabel(fx)}</div>
                <button
                  onClick={() => addLeg(fx)}
                  style={{ marginLeft: "auto" }}
                >
                  Add leg
                </button>
              </div>
            ))}
          </div>

          {!fixtures.length && (
            <div style={{ opacity: 0.6, marginTop: 8 }}>
              No fixtures for {day} ({sport})
            </div>
          )}

          {/* legs */}
          <h3 style={{ marginTop: 22 }}>Legs ({legs.length})</h3>
          <form onSubmit={submit}>
            {legs.map((l, i) => (
              <div
                key={`${l.fixture_id}-${i}`}
                style={{
                  marginBottom: 10,
                  background: "#04210F",
                  padding: 8,
                  borderRadius: 8,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {/* Fixture label + remove */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div>
                    <strong>{l.home_name}</strong> vs{" "}
                    <strong>{l.away_name}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => rmLeg(i)}
                    style={{ marginLeft: "auto" }}
                  >
                    ✕
                  </button>
                </div>

                {/* Leg type toggle */}
                <div>
                  <div
                    style={{
                      marginBottom: 4,
                      fontSize: 12,
                      opacity: 0.85,
                    }}
                  >
                    Leg type
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => updateLegField(i, "legType", "match")}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        border:
                          l.legType === "match"
                            ? "1px solid rgba(34,197,94,0.8)"
                            : "1px solid rgba(148,163,184,0.5)",
                        background:
                          l.legType === "match"
                            ? "rgba(22,163,74,0.15)"
                            : "transparent",
                        color: "#e5e7eb",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Match market
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLegField(i, "legType", "player")}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        border:
                          l.legType === "player"
                            ? "1px solid rgba(59,130,246,0.8)"
                            : "1px solid rgba(148,163,184,0.5)",
                        background:
                          l.legType === "player"
                            ? "rgba(37,99,235,0.15)"
                            : "transparent",
                        color: "#e5e7eb",
                        fontSize: 11,
                        cursor: "pointer",
                      }}
                    >
                      Player prop
                    </button>
                  </div>
                </div>

                {/* Match market row */}
                {l.legType === "match" && (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 1fr",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <label style={{ fontSize: 13 }}>
                        Market
                        <select
                          value={l.market}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateLegField(i, "market", v);
                            // clear details when switching family
                            if (!DETAIL_MARKETS.has(v)) {
                              updateLegField(i, "marketDetail", "");
                            }
                          }}
                          style={{ width: "100%", marginTop: 2 }}
                        >
                          {MATCH_MARKETS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={{ fontSize: 13 }}>
                        Bookmaker
                        <input
                          value={l.bookmaker}
                          onChange={(e) =>
                            updateLegField(i, "bookmaker", e.target.value)
                          }
                          placeholder="bet365"
                          style={{ width: "100%", marginTop: 2 }}
                        />
                      </label>

                      <label style={{ fontSize: 13 }}>
                        Odds
                        <input
                          type="number"
                          step="0.01"
                          value={l.price}
                          onChange={(e) =>
                            updateLegField(i, "price", e.target.value)
                          }
                          style={{ width: "100%", marginTop: 2 }}
                        />
                      </label>
                    </div>

                    {isDetailMarket(l.market) && (
                      <label style={{ fontSize: 13, marginTop: 4 }}>
                        Market details
                        <input
                          value={l.marketDetail || ""}
                          onChange={(e) =>
                            updateLegField(
                              i,
                              "marketDetail",
                              e.target.value
                            )
                          }
                          placeholder="e.g. Celtic -1.5, Team Over 9.5 corners"
                          style={{ width: "100%", marginTop: 2 }}
                        />
                        <div
                          style={{
                            fontSize: 11,
                            opacity: 0.75,
                            marginTop: 2,
                          }}
                        >
                          This will be appended to the base market. For example,
                          if you choose <code>HANDICAP</code> and type{" "}
                          <code>Celtic -1.5</code>, the stored market will be{" "}
                          <em>"HANDICAP - Celtic -1.5"</em>. Performance can
                          still treat all <code>HANDICAP</code> legs together.
                        </div>
                      </label>
                    )}
                  </>
                )}

                {/* Player prop box */}
                {l.legType === "player" && (
                  <div
                    style={{
                      borderRadius: 10,
                      padding: "8px 10px",
                      border: "1px solid rgba(59,130,246,0.4)",
                      background: "rgba(15,23,42,0.7)",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 0.8fr",
                        gap: 8,
                      }}
                    >
                      <label style={{ fontSize: 13 }}>
                        Player name
                        <input
                          value={l.player}
                          onChange={(e) =>
                            updateLegField(i, "player", e.target.value)
                          }
                          placeholder="e.g. Bukayo Saka"
                          style={{ width: "100%", marginTop: 2 }}
                        />
                      </label>

                      <label style={{ fontSize: 13 }}>
                        Prop type
                        <select
                          value={l.type}
                          onChange={(e) =>
                            updateLegField(i, "type", e.target.value)
                          }
                          style={{ width: "100%", marginTop: 2 }}
                        >
                          {PROP_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    {l.type !== "goals_anytime" && (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "0.8fr 0.8fr 0.8fr",
                          gap: 8,
                        }}
                      >
                        <label style={{ fontSize: 13 }}>
                          Line
                          <input
                            type="number"
                            step="0.5"
                            value={l.line}
                            onChange={(e) =>
                              updateLegField(i, "line", e.target.value)
                            }
                            placeholder="e.g. 1.5"
                            style={{ width: "100%", marginTop: 2 }}
                          />
                        </label>

                        <label style={{ fontSize: 13 }}>
                          Side
                          <select
                            value={l.side}
                            onChange={(e) =>
                              updateLegField(i, "side", e.target.value)
                            }
                            style={{ width: "100%", marginTop: 2 }}
                          >
                            <option value="over">Over</option>
                            <option value="under">Under</option>
                          </select>
                        </label>

                        <label style={{ fontSize: 13 }}>
                          Odds
                          <input
                            type="number"
                            step="0.01"
                            value={l.price}
                            onChange={(e) =>
                              updateLegField(i, "price", e.target.value)
                            }
                            style={{ width: "100%", marginTop: 2 }}
                          />
                        </label>
                      </div>
                    )}

                    {l.type === "goals_anytime" && (
                      <label style={{ fontSize: 13 }}>
                        Odds
                        <input
                          type="number"
                          step="0.01"
                          value={l.price}
                          onChange={(e) =>
                            updateLegField(i, "price", e.target.value)
                          }
                          style={{ width: "100%", marginTop: 2 }}
                        />
                      </label>
                    )}

                    <label style={{ fontSize: 13 }}>
                      Bookmaker
                      <input
                        value={l.bookmaker}
                        onChange={(e) =>
                          updateLegField(i, "bookmaker", e.target.value)
                        }
                        placeholder="bet365"
                        style={{ width: "100%", marginTop: 2 }}
                      />
                    </label>

                    <div style={{ fontSize: 11, opacity: 0.75 }}>
                      This leg will be stored as a readable market like{" "}
                      <em>"Bukayo Saka - Over 1.5 Shots on Target"</em>.
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Premium ACCA toggle */}
            <div
              style={{
                marginTop: 14,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(22,163,74,0.08)",
                border: "1px solid rgba(34,197,94,0.35)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <div>
                <strong>Premium-only Acca</strong>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Only site Premium members (and yourself) can view this acca.
                </div>
              </div>
            </div>

            {/* Subscriber-only ACCA toggle */}
            <div
              style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(37,99,235,0.08)",
                border: "1px solid rgba(59,130,246,0.5)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <input
                type="checkbox"
                checked={isSubscriberOnly}
                onChange={(e) => setIsSubscriberOnly(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <div>
                <strong>Subscriber-only Acca</strong>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Only people subscribed to your tipster page will see this
                  acca.
                </div>
              </div>
            </div>

            {/* Totals */}
            <div
              style={{
                display: "flex",
                gap: 18,
                marginTop: 20,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label>
                Stake:&nbsp;
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                />
              </label>

              <div>
                Combined: <strong>{combined.toFixed(2)}</strong>
              </div>

              <div>
                Profit:{" "}
                <strong>
                  {(parseFloat(stake || 0) * (combined - 1)).toFixed(2)}
                </strong>
              </div>

              <button
                type="submit"
                className="btnPrimary"
                style={{ marginLeft: "auto" }}
              >
                Create Acca
              </button>
            </div>

            {err && (
              <div style={{ color: "salmon", marginTop: 8 }}>{err}</div>
            )}
          </form>
        </>
      )}
    </div>
  );
}