import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { fetchDailyFixtures, createTipsterPick } from "../api";
import { useAuth } from "../components/AuthGate";

// --- Market presets per sport ---
const MARKET_PRESETS = {
  football: [
    { value: "HOME_WIN", label: "Home Win (1)" },
    { value: "DRAW", label: "Draw (X)" },
    { value: "AWAY_WIN", label: "Away Win (2)" },
    { value: "O2.5", label: "Over 2.5" },
    { value: "U2.5", label: "Under 2.5" },
    { value: "BTTS_Y", label: "BTTS: Yes" },
    { value: "BTTS_N", label: "BTTS: No" },
  ],
  nfl: [
    { value: "HOME_WIN", label: "Moneyline: Home" },
    { value: "AWAY_WIN", label: "Moneyline: Away" },
    { value: "O47.5", label: "Over 47.5" },
    { value: "U47.5", label: "Under 47.5" },
  ],
  cfb: [
    { value: "HOME_WIN", label: "Moneyline: Home" },
    { value: "AWAY_WIN", label: "Moneyline: Away" },
    { value: "O55.5", label: "Over 55.5" },
    { value: "U55.5", label: "Under 55.5" },
  ],
  nhl: [
    { value: "HOME_WIN", label: "Moneyline: Home" },
    { value: "AWAY_WIN", label: "Moneyline: Away" },
    { value: "O5.5", label: "Over 5.5" },
    { value: "U5.5", label: "Under 5.5" },
  ],
  basketball: [
    { value: "HOME_WIN", label: "Moneyline: Home" },
    { value: "AWAY_WIN", label: "Moneyline: Away" },
    { value: "O221.5", label: "Over 221.5" },
    { value: "U221.5", label: "Under 221.5" },
  ],
};

// --- Common bookmakers ---
const BOOKMAKERS = [
  "bet365",
  "skybet",
  "williamhill",
  "paddypower",
  "betfair",
  "unibet",
  "ladbrokes",
  "coral",
  "betfred",
  "Custom…",
];

const iso = (d) => d.toISOString().slice(0, 10);

export default function TipsterAddPick() {
  const { username } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [day, setDay] = useState(iso(new Date()));
  const [fixtures, setFixtures] = useState([]);
  const [loadingFx, setLoadingFx] = useState(false);
  const [fixturesErr, setFixturesErr] = useState("");
  const [fixtureId, setFixtureId] = useState("");
  const [filter, setFilter] = useState("");

  const [market, setMarket] = useState("HOME_WIN");
  const [bookmaker, setBookmaker] = useState("bet365");
  const [customBook, setCustomBook] = useState("");
  const [price, setPrice] = useState("");
  const [stake, setStake] = useState("1.0");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedFixture = useMemo(
    () => fixtures.find((f) => String(f.id) === String(fixtureId)),
    [fixtures, fixtureId]
  );

  const sportFromFixture = selectedFixture?.sport || "football";
  const marketOptions = MARKET_PRESETS[sportFromFixture] || MARKET_PRESETS.football;
  const activeBookmaker =
    bookmaker === "Custom…" ? (customBook.trim() || "") : bookmaker;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingFx(true);
      setFixturesErr("");
      try {
        const rows = await fetchDailyFixtures(day, "all");
        if (!cancelled) setFixtures(rows || []);
      } catch (e) {
        if (!cancelled) setFixturesErr(e?.message || "Failed to load fixtures");
      } finally {
        if (!cancelled) setLoadingFx(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [day]);

  const filteredFixtures = useMemo(() => {
    if (!filter.trim()) return fixtures;
    const q = filter.trim().toLowerCase();
    return fixtures.filter((fx) => {
      const h = (fx.home_team || "").toLowerCase();
      const a = (fx.away_team || "").toLowerCase();
      const c = (fx.comp || "").toLowerCase();
      return h.includes(q) || a.includes(q) || c.includes(q);
    });
  }, [fixtures, filter]);

  const labelOf = (f) => {
    const time = f.kickoff_utc
      ? new Date(f.kickoff_utc).toISOString().slice(11, 16)
      : "TBD";
    const comp = f.comp ? ` • ${f.comp}` : "";
    const s = f.sport ? ` [${f.sport}]` : "";
    return `${time} — ${f.home_team} vs ${f.away_team}${comp}${s}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!fixtureId) return setErr("Please select a fixture.");
    if (!activeBookmaker) return setErr("Please choose a bookmaker.");
    setSaving(true);
    try {
      await createTipsterPick(username, {
        fixture_id: Number(fixtureId),
        market,
        bookmaker: activeBookmaker.trim(),
        price: Number(price),
        stake: Number(stake) || 1.0,
      });
      nav(`/tipsters/${encodeURIComponent(username)}`);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to add pick");
    } finally {
      setSaving(false);
    }
  };

  const setToday = () => setDay(iso(new Date()));
  const setTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    setDay(iso(d));
  };

  if (!user)
    return (
      <div style={{ maxWidth: 720 }}>
        <h2>Add Pick</h2>
        <p>You need to log in to add a pick.</p>
        <Link to="/login">Go to login</Link>
      </div>
    );

  return (
    <div style={{ maxWidth: 720 }}>
      <h2>Add Pick</h2>
      <p style={{ opacity: 0.8 }}>Posting as <b>@{username}</b></p>

      {/* --- Day controls --- */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "10px 0" }}>
        <label htmlFor="day">Day</label>
        <input
          id="day"
          type="date"
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <button type="button" onClick={setToday}>Today</button>
        <button type="button" onClick={setTomorrow}>Tomorrow</button>
      </div>

      {/* --- Fixture picker --- */}
      <label>Search fixture</label>
      <input
        placeholder="Type team or competition…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />

      <label>Fixture</label>
      {loadingFx ? (
        <div>Loading fixtures…</div>
      ) : fixturesErr ? (
        <div style={{ color: "salmon" }}>{fixturesErr}</div>
      ) : (
        <select
          value={fixtureId}
          onChange={(e) => setFixtureId(e.target.value)}
          style={{ width: "100%" }}
        >
          <option value="">Select a fixture…</option>
          {filteredFixtures.map((f) => (
            <option key={f.id} value={f.id}>
              {labelOf(f)}
            </option>
          ))}
        </select>
      )}

      {/* --- Market / odds form --- */}
      <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
        <div>
          <label>Market</label>
          <select
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            disabled={!selectedFixture}
          >
            {(marketOptions || []).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Bookmaker</label>
          <select value={bookmaker} onChange={(e) => setBookmaker(e.target.value)}>
            {BOOKMAKERS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          {bookmaker === "Custom…" && (
            <input
              style={{ marginTop: 6 }}
              placeholder="Enter bookmaker name…"
              value={customBook}
              onChange={(e) => setCustomBook(e.target.value)}
            />
          )}
        </div>

        <div>
          <label>Odds (decimal)</label>
          <input
            required
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 1.95"
          />
        </div>

        <div>
          <label>Stake (units)</label>
          <input
            type="number"
            step="0.1"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            placeholder="1.0"
          />
        </div>

        {err && <div style={{ color: "salmon" }}>{err}</div>}

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving || !fixtureId}>
            {saving ? "Saving…" : "Post Pick"}
          </button>
          <Link to={`/tipsters/${encodeURIComponent(username)}`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}