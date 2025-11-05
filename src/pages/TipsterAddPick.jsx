// src/pages/TipsterAddPick.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchDailyFixtures, createTipsterPick, fetchTipster } from "../api";
import { useAuth } from "../components/AuthGate";

export default function TipsterAddPick() {
  const { username } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [tipster, setTipster] = useState(null);
  const [fixtures, setFixtures] = useState([]);       // always an array
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // form state
  const [fixtureId, setFixtureId] = useState("");
  const [market, setMarket] = useState("HOME_WIN");
  const [bookmaker, setBookmaker] = useState("bet365");
  const [price, setPrice] = useState("");
  const [stake, setStake] = useState("1.0");

  // normalize API shape safely -> always []
  const normalizeFixtures = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.fixtures)) return data.fixtures;
    if (data && Array.isArray(data.rows)) return data.rows;
    return [];
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErr("");
        setLoading(true);

        // 1) load tipster (also used to show name and to 404 if not found)
        const t = await fetchTipster(username);
        if (!mounted) return;
        setTipster(t);

        // 2) load today's fixtures
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
        const res = await fetchDailyFixtures(today, "all");
        if (!mounted) return;

        const rows = normalizeFixtures(res);
        setFixtures(rows);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.detail || e.message || "Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [username]);

  // selected fixture object (guarded)
  const selectedFixture = useMemo(() => {
    if (!Array.isArray(fixtures)) return null;
    return fixtures.find(f => String(f.id) === String(fixtureId)) || null;
  }, [fixtures, fixtureId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      if (!fixtureId) throw new Error("Pick a fixture");
      if (!price || Number(price) <= 1.0) throw new Error("Enter a valid decimal price (>1.00)");

      await createTipsterPick(username, {
        fixture_id: Number(fixtureId),
        market,
        bookmaker: bookmaker || null,
        price: Number(price),
        stake: Number(stake) || 1.0,
      });

      // go back to the tipster page
      nav(`/tipsters/${username}`);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to create pick");
    }
  };

  if (loading) return <div>Loading…</div>;
  if (err) return <div style={{ color: "salmon" }}>{err}</div>;
  if (!tipster) return <div>Tipster not found</div>;

  // simple market options (expand later)
  const MARKET_OPTIONS = [
    "HOME_WIN", "DRAW", "AWAY_WIN",
    "O2.5", "U2.5", "BTTS_Y", "BTTS_N"
  ];

  // best-effort label for fixtures
  const fixtureLabel = (f) => {
    const ko = f.kickoff_utc ? new Date(f.kickoff_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
    return `${f.home_team ?? f.home ?? "Home"} vs ${f.away_team ?? f.away ?? "Away"} — ${ko}`;
    // (supports different API shapes)
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <Link to={`/tipsters/${username}`}>← Back</Link>
      <h2>Add Pick for @{username}</h2>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Fixture
          <select
            value={fixtureId}
            onChange={(e) => setFixtureId(e.target.value)}
            required
          >
            <option value="">Select a fixture…</option>
            {fixtures.map((f) => (
              <option key={f.id} value={f.id}>
                {fixtureLabel(f)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Market
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            {MARKET_OPTIONS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label>
          Bookmaker (optional)
          <input
            value={bookmaker}
            onChange={(e) => setBookmaker(e.target.value)}
            placeholder="bet365"
          />
        </label>

        <label>
          Price (decimal)
          <input
            type="number"
            step="0.01"
            min="1.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </label>

        <label>
          Stake (units)
          <input
            type="number"
            step="0.1"
            min="0"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
          />
        </label>

        {selectedFixture && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            <strong>Preview:</strong> {fixtureLabel(selectedFixture)} — {market} @ {price || "—"} ({bookmaker || "—"})
          </div>
        )}

        <button type="submit">Create Pick</button>
      </form>
    </div>
  );
}