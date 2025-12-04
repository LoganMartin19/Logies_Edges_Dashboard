// src/pages/TipsterAddPick.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  createTipsterPick,
  fetchDailyFixtures,
  sendTipsterPicksEmail, // 👈 NEW
} from "../api";
import { useAuth } from "../components/AuthGate";

const todayStr = () => new Date().toISOString().slice(0, 10);

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

// Canonical match markets for performance + a few new families
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

  // New “families” – line/details typed by the tipster
  { value: "HANDICAP", label: "Handicap / Asian Handicap" },
  { value: "CORNERS", label: "Corners" },
  { value: "CARDS", label: "Cards / Bookings" },
  { value: "OTHER", label: "Other Market" },
];

const DETAIL_MARKETS = new Set(["HANDICAP", "CORNERS", "CARDS", "OTHER"]);

export default function TipsterAddPick() {
  const { username } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  // ---- form + fixtures state ----
  const [day, setDay] = useState(todayStr());
  const [sport, setSport] = useState("football");
  const [fixtures, setFixtures] = useState([]);

  const [form, setForm] = useState({
    fixture_id: "",
    market: "HOME_WIN", // default for match markets
    bookmaker: "bet365",
    price: "",
    stake: "1.0",
    is_premium_only: false,
    is_subscriber_only: false,
  });

  // NEW: market details for handicap/corners/cards/other
  const [marketDetail, setMarketDetail] = useState("");

  // NEW: pick type + player prop state
  const [pickType, setPickType] = useState("match"); // "match" | "player"
  const [prop, setProp] = useState({
    player: "",
    type: "shots",
    line: "",
    side: "over", // "over" | "under"
  });

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState(null); // "post" | "post_and_email" | null
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  // ---- helpers ----
  const update = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const updateProp = (k) => (e) =>
    setProp((p) => ({
      ...p,
      [k]: e.target.value,
    }));

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

  // ---- load fixtures (top-level hook, never conditional) ----
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setLoadingFixtures(true);
        const res = await fetchDailyFixtures(day, sport); // /api/public/fixtures/daily
        if (!alive) return;
        const list = normalizeFixtures(res);
        setFixtures(list);

        // if no fixture selected yet, prefill with first one
        if (list.length && !form.fixture_id) {
          setForm((f) => ({ ...f, fixture_id: String(list[0].id) }));
        }
      } catch (e) {
        if (!alive) return;
        setErr(
          e?.response?.data?.detail || e.message || "Failed to load fixtures"
        );
        setFixtures([]);
      } finally {
        if (alive) setLoadingFixtures(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, sport]);

  // ---- early return AFTER hooks ----
  if (!user) {
    return (
      <div style={{ maxWidth: 560, padding: 16 }}>
        <h2>Add Pick</h2>
        <p>You need to be logged in to add a pick.</p>
        <Link to="/login">Go to login</Link>
      </div>
    );
  }

  const buildPlayerPropMarketLabel = () => {
    const player = (prop.player || "").trim();
    const type = prop.type;
    const line = (prop.line || "").trim();
    const side = prop.side;

    if (!player) {
      throw new Error("Please enter a player name");
    }
    if (!type) {
      throw new Error("Please choose a player prop type");
    }

    // Anytime goalscorer: no line/side required
    if (type === "goals_anytime") {
      return `${player} - Anytime Goalscorer`;
    }

    if (!line) {
      throw new Error("Please enter a line (e.g. 0.5, 1.5)");
    }

    const typeLabel = PROP_TYPE_LABEL[type] || type;
    const sideWord = side === "under" ? "Under" : "Over";
    return `${player} - ${sideWord} ${line} ${typeLabel}`;
  };

  // Shared handler used by both "Post" and "Post & email" flows
  const handleSubmit = async ({ sendEmail = false } = {}) => {
    setErr("");
    setSaving(true);
    setSavingMode(sendEmail ? "post_and_email" : "post");

    try {
      if (!form.fixture_id) {
        throw new Error("Please choose a fixture");
      }

      let marketToSend = form.market.trim();

      if (pickType === "player") {
        // Player props → nice human label
        marketToSend = buildPlayerPropMarketLabel();
      } else {
        // Match markets: if it's a detail market (handicap/corners/cards/other),
        // append the line/description so the pick is readable.
        const detail = (marketDetail || "").trim();
        if (DETAIL_MARKETS.has(form.market) && detail) {
          marketToSend = `${marketToSend} - ${detail}`;
        }
      }

      if (!marketToSend) {
        throw new Error("Market is required");
      }

      const priceNum = Number(form.price);
      if (!priceNum || Number.isNaN(priceNum)) {
        throw new Error("Please enter valid decimal odds");
      }

      const payload = {
        fixture_id: Number(form.fixture_id),
        market: marketToSend,
        bookmaker: form.bookmaker.trim() || null,
        price: priceNum,
        stake: Number(form.stake) || 1.0,
        is_premium_only: !!form.is_premium_only,
        is_subscriber_only: !!form.is_subscriber_only,
      };

      // 1) Create the pick
      await createTipsterPick(username, payload);

      // 2) Optionally send today's picks email
      if (sendEmail) {
        try {
          const res = await sendTipsterPicksEmail(username);
          // naive toast/alert for now
          window.alert(
            `Email sent ✅\n\nRecipients: ${res.recipient_count}\nSent: ${res.sent_count}\nSkipped: ${res.skipped_count}`
          );
        } catch (e3) {
          console.error("Failed to send tipster picks email", e3);
          window.alert(
            `Pick posted, but sending the email failed:\n${
              e3?.response?.data?.detail || e3.message || "Unknown error"
            }`
          );
        }
      }

      // 3) Back to tipster page
      nav(`/tipsters/${encodeURIComponent(username)}`);
    } catch (e2) {
      setErr(
        e2?.response?.data?.detail || e2.message || "Failed to add pick"
      );
    } finally {
      setSaving(false);
      setSavingMode(null);
    }
  };

  // Form submit = just post (no email)
  const onSubmit = (e) => {
    e.preventDefault();
    if (!saving) {
      handleSubmit({ sendEmail: false });
    }
  };

  const isDetailMarket = DETAIL_MARKETS.has(form.market);

  return (
    <div style={{ maxWidth: 640, padding: 16 }}>
      <Link to={`/tipsters/${encodeURIComponent(username)}`}>← Back</Link>
      <h2 style={{ marginTop: 6 }}>Add Pick</h2>
      <p style={{ marginTop: -4, opacity: 0.8 }}>
        Posting as <b>@{username}</b>
      </p>

      {/* Day + sport filters (same pattern as Acca) */}
      <div style={{ display: "flex", gap: 12, margin: "12px 0 16px" }}>
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
          <select value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="football">Football</option>
            <option value="nba">NBA</option>
            <option value="nhl">NHL</option>
            <option value="nfl">NFL</option>
            <option value="cfb">CFB</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {loadingFixtures && (
        <div style={{ marginBottom: 8, opacity: 0.8 }}>Loading fixtures…</div>
      )}

      {err && <div style={{ color: "salmon", margin: "10px 0" }}>{err}</div>}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Fixture
          <select
            required
            value={form.fixture_id}
            onChange={update("fixture_id")}
          >
            <option value="">Select a fixture…</option>
            {fixtures.map((fx) => (
              <option key={fx.id} value={fx.id}>
                {formatFixtureLabel(fx)}
              </option>
            ))}
          </select>
        </label>

        {/* Pick type toggle */}
        <div>
          <div style={{ marginBottom: 6, fontWeight: 600 }}>Pick type</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setPickType("match")}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border:
                  pickType === "match"
                    ? "1px solid rgba(34,197,94,0.8)"
                    : "1px solid rgba(148,163,184,0.5)",
                background:
                  pickType === "match"
                    ? "rgba(22,163,74,0.15)"
                    : "transparent",
                color: "#e5e7eb",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Match market
            </button>
            <button
              type="button"
              onClick={() => setPickType("player")}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border:
                  pickType === "player"
                    ? "1px solid rgba(59,130,246,0.8)"
                    : "1px solid rgba(148,163,184,0.5)",
                background:
                  pickType === "player"
                    ? "rgba(37,99,235,0.15)"
                    : "transparent",
                color: "#e5e7eb",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Player prop
            </button>
          </div>
        </div>

        {pickType === "match" && (
          <>
            <label>
              Market
              <select
                required
                value={form.market}
                onChange={(e) => {
                  update("market")(e);
                  // reset extra detail when switching market family
                  setMarketDetail("");
                }}
              >
                {MATCH_MARKETS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            {isDetailMarket && (
              <label>
                Market details
                <input
                  value={marketDetail}
                  onChange={(e) => setMarketDetail(e.target.value)}
                  placeholder="e.g. Celtic -1.5, Team Over 9.5 corners"
                />
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  This will be appended to the base market. For example, if you
                  choose <code>HANDICAP</code> and type{" "}
                  <code>Celtic -1.5</code>, the stored market will be{" "}
                  <em>"HANDICAP - Celtic -1.5"</em>.
                </div>
              </label>
            )}
          </>
        )}

        {pickType === "player" && (
          <div
            style={{
              borderRadius: 10,
              padding: "10px 12px",
              border: "1px solid rgba(59,130,246,0.4)",
              background: "rgba(15,23,42,0.7)",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Player prop details
            </div>

            <label>
              Player name
              <input
                value={prop.player}
                onChange={updateProp("player")}
                placeholder="e.g. Bukayo Saka"
              />
            </label>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr",
                gap: 8,
              }}
            >
              <label>
                Prop type
                <select value={prop.type} onChange={updateProp("type")}>
                  {PROP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              {/* Line & side only if not anytime goalscorer */}
              {prop.type !== "goals_anytime" && (
                <label>
                  Line
                  <input
                    type="number"
                    step="0.5"
                    value={prop.line}
                    onChange={updateProp("line")}
                    placeholder="e.g. 1.5"
                  />
                </label>
              )}
            </div>

            {prop.type !== "goals_anytime" && (
              <label>
                Side
                <select value={prop.side} onChange={updateProp("side")}>
                  <option value="over">Over</option>
                  <option value="under">Under</option>
                </select>
              </label>
            )}

            <div style={{ fontSize: 12, opacity: 0.8 }}>
              We’ll store this as a readable market like:{" "}
              <em>"Bukayo Saka - Over 1.5 Shots on Target"</em>.
            </div>
          </div>
        )}

        <label>
          Bookmaker
          <input
            value={form.bookmaker}
            onChange={update("bookmaker")}
            placeholder="bet365"
          />
        </label>

        <label>
          Odds (decimal)
          <input
            required
            type="number"
            step="0.01"
            value={form.price}
            onChange={update("price")}
            placeholder="e.g. 1.95"
          />
        </label>

        <label>
          Stake (units)
          <input
            type="number"
            step="0.1"
            value={form.stake}
            onChange={update("stake")}
            placeholder="1.0"
          />
        </label>

        {/* Premium-only toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(22,163,74,0.08)",
            border: "1px solid rgba(34,197,94,0.35)",
          }}
        >
          <input
            type="checkbox"
            checked={form.is_premium_only}
            onChange={update("is_premium_only")}
            style={{ marginTop: 3 }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>Premium-only pick</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Only CSB Premium members (and you) will see this pick.
            </div>
          </div>
        </label>

        {/* Subscriber-only toggle */}
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(37,99,235,0.08)",
            border: "1px solid rgba(59,130,246,0.5)",
          }}
        >
          <input
            type="checkbox"
            checked={form.is_subscriber_only}
            onChange={update("is_subscriber_only")}
            style={{ marginTop: 3 }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>Subscriber-only pick</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Only people subscribed to your tipster page will see this pick.
            </div>
          </div>
        </label>

        <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
          <button type="submit" disabled={saving}>
            {saving && savingMode === "post"
              ? "Saving…"
              : saving && savingMode === "post_and_email"
              ? "Posting…"
              : "Post Pick"}
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSubmit({ sendEmail: true })}
          >
            {saving && savingMode === "post_and_email"
              ? "Posting & emailing…"
              : "Post & email today’s picks"}
          </button>

          <Link to={`/tipsters/${encodeURIComponent(username)}`}>Cancel</Link>
        </div>

        <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
          The email button sends all picks you’ve posted <strong>today</strong>{" "}
          to your followers and active subscribers.
        </div>
      </form>
    </div>
  );
}