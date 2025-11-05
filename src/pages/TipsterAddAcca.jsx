// src/pages/TipsterAddAcca.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchDailyFixtures, createTipsterAcca } from "../api";

const todayStr = () => new Date().toISOString().slice(0, 10);

// Market presets by sport (extend later as needed)
const MARKET_PRESETS = {
  football: ["HOME_WIN", "DRAW", "AWAY_WIN", "BTTS_Y", "BTTS_N", "O2.5", "U2.5"],
  nba: ["HOME_WIN", "AWAY_WIN", "O221.5", "U221.5"],
  nhl: ["HOME_WIN", "AWAY_WIN", "O5.5", "U5.5"],
  nfl: ["HOME_WIN", "AWAY_WIN", "O47.5", "U47.5"],
  cfb: ["HOME_WIN", "AWAY_WIN", "O57.5", "U57.5"],
};

export default function TipsterAddAcca() {
  const { username } = useParams();
  const nav = useNavigate();

  const [day, setDay] = useState(todayStr());
  const [sport, setSport] = useState("football");
  const [fixtures, setFixtures] = useState([]);
  const [loadingFx, setLoadingFx] = useState(false);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [stake, setStake] = useState("1.0");

  const [legs, setLegs] = useState([]);
  const [err, setErr] = useState("");

  // Load fixtures for chosen day/sport
  useEffect(() => {
    let isCancelled = false;
    async function load() {
      try {
        setLoadingFx(true);
        const data = await fetchDailyFixtures(day, sport); // /api/public/fixtures/daily
        if (!isCancelled) setFixtures(Array.isArray(data) ? data : []);
      } catch {
        if (!isCancelled) setFixtures([]);
      } finally {
        if (!isCancelled) setLoadingFx(false);
      }
    }
    load();
    return () => { isCancelled = true; };
  }, [day, sport]);

  const markets = useMemo(() => MARKET_PRESETS[sport] ?? MARKET_PRESETS.football, [sport]);

  const addLeg = (fx) => {
    setLegs((prev) => ([
      ...prev,
      {
        fixture_id: fx.id,
        market: markets[0] || "HOME_WIN",
        price: "2.00",
        bookmaker: "bet365",
        home_name: fx.home?.name || fx.home_name || fx.home_team || "Home",
        away_name: fx.away?.name || fx.away_name || fx.away_team || "Away",
      }
    ]));
  };

  const rmLeg = (i) => setLegs((prev) => prev.filter((_, idx) => idx !== i));

  const updateLeg = (i, field, value) => {
    setLegs((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value };
      return copy;
    });
  };

  const combined = useMemo(() => {
    if (!legs.length) return 1;
    return legs.reduce((acc, l) => {
      const q = parseFloat(l.price);
      return acc * (Number.isFinite(q) && q > 1 ? q : 1);
    }, 1);
  }, [legs]);

  const stakeNum = useMemo(() => {
    const v = parseFloat(stake);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }, [stake]);

  const potentialProfit = useMemo(() => {
    if (stakeNum <= 0) return 0;
    return stakeNum * (combined - 1);
  }, [stakeNum, combined]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      setErr("");

      if (legs.length < 2) throw new Error("An acca needs at least 2 legs.");
      if (!stakeNum) throw new Error("Please enter a valid stake (units).");

      // Build payload to match backend
      const payload = {
        day,                 // "YYYY-MM-DD"
        sport,               // "football" | "nba" | ...
        title: title?.trim() || null,
        note: note?.trim() || null,
        stake_units: stakeNum,
        legs: legs.map((l) => ({
          fixture_id: l.fixture_id,
          market: l.market,
          bookmaker: l.bookmaker || "bet365",
          price: parseFloat(l.price),
        })),
      };

      await createTipsterAcca(username, payload);
      nav(`/tipsters/${username}/accas`);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2.message || "Failed to create acca");
    }
  };

  return (
    <div style={{ maxWidth: 880 }}>
      <h2>Create Acca</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, margin: "10px 0 18px" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: .8 }}>Day</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: .8 }}>Sport</span>
          <select value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="football">Football</option>
            <option value="nba">NBA</option>
            <option value="nhl">NHL</option>
            <option value="nfl">NFL</option>
            <option value="cfb">CFB</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ opacity: .8 }}>Stake (units)</span>
          <input type="number" min="0.1" step="0.1" value={stake} onChange={(e) => setStake(e.target.value)} />
        </label>

        <div style={{ display: "grid", gap: 6, alignContent: "end" }}>
          <div>Combined: <strong>{combined.toFixed(2)}</strong></div>
          <div>Potential Profit: <strong>{potentialProfit.toFixed(2)}</strong></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <input
          placeholder="Acca title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <h3 style={{ marginTop: 10, marginBottom: 8 }}>
        {loadingFx ? "Loading fixtures…" : "Fixtures"}
      </h3>

      <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        {fixtures.map((fx) => {
          const home = fx.home?.name || fx.home_name || fx.home_team || "Home";
          const away = fx.away?.name || fx.away_name || fx.away_team || "Away";
          return (
            <div
              key={fx.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#0c331f",
                padding: 10,
                borderRadius: 8,
              }}
            >
              <div style={{ fontWeight: 600 }}>{home}</div>
              <div style={{ opacity: .7 }}>vs</div>
              <div style={{ fontWeight: 600 }}>{away}</div>
              <button onClick={() => addLeg(fx)} style={{ marginLeft: "auto" }}>
                Add leg
              </button>
            </div>
          );
        })}
        {!fixtures.length && !loadingFx && (
          <div style={{ opacity: .7 }}>No fixtures for this day/sport.</div>
        )}
      </div>

      <h3 style={{ marginTop: 20 }}>Legs ({legs.length})</h3>

      <form onSubmit={submit}>
        {legs.map((l, i) => (
          <div
            key={`${l.fixture_id}-${i}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 140px 120px 120px 32px",
              gap: 8,
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              <strong>{l.home_name}</strong> vs <strong>{l.away_name}</strong>
            </div>

            <select
              value={l.market}
              onChange={(e) => updateLeg(i, "market", e.target.value)}
            >
              {markets.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={l.bookmaker}
              onChange={(e) => updateLeg(i, "bookmaker", e.target.value)}
              placeholder="bookmaker"
            />

            <input
              type="number"
              min="1"
              step="0.01"
              value={l.price}
              onChange={(e) => updateLeg(i, "price", e.target.value)}
              placeholder="decimal odds"
            />

            <button type="button" onClick={() => rmLeg(i)} aria-label="Remove leg">
              ✕
            </button>
          </div>
        ))}

        <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "center" }}>
          <button type="submit" className="btnPrimary" style={{ marginLeft: "auto" }}>
            Create Acca
          </button>
        </div>

        {err && <div style={{ color: "salmon", marginTop: 8 }}>{err}</div>}
      </form>
    </div>
  );
}