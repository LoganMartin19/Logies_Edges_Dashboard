// src/pages/TipsterAddAcca.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { fetchDailyFixtures, createTipsterAcca } from "../api";

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function TipsterAddAcca() {
  const { username } = useParams();
  const nav = useNavigate();

  const [day, setDay] = useState(todayStr());
  const [sport, setSport] = useState("football");
  const [fixtures, setFixtures] = useState([]);
  const [legs, setLegs] = useState([]);
  const [stake, setStake] = useState(1.0);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Normalize /api/public/fixtures/daily shape -> []
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
        const res = await fetchDailyFixtures(day, sport);
        if (!mounted) return;
        setFixtures(normalizeFixtures(res));
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.detail || e.message || "Failed to load fixtures");
        setFixtures([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [day, sport]);

  // ✅ Correctly read home vs away for *both* public and internal shapes
  const nameFor = (fx, side) => {
    if (side === "home") {
      return (
        fx.home_team ??
        fx.home?.name ??
        fx.home_name ??
        fx.home ??
        "Home"
      );
    }
    return (
      fx.away_team ??
      fx.away?.name ??
      fx.away_name ??
      fx.away ??
      "Away"
    );
  };

  const koLabel = (fx) => {
    try {
      if (!fx.kickoff_utc) return "";
      return new Date(fx.kickoff_utc).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const label = (fx) => `${nameFor(fx, "home")} vs ${nameFor(fx, "away")}${koLabel(fx) ? ` — ${koLabel(fx)}` : ""}`;

  const markets = ["HOME_WIN","AWAY_WIN","DRAW","BTTS_Y","BTTS_N","O2.5","U2.5"];

  const addLeg = (fx) => {
    setLegs((prev) => [
      ...prev,
      {
        fixture_id: Number(fx.id),
        market: "HOME_WIN",
        price: 2.0,
        bookmaker: "bet365",
        home_name: nameFor(fx, "home"),
        away_name: nameFor(fx, "away"),
      },
    ]);
  };

  const rmLeg = (i) => setLegs((prev) => prev.filter((_, idx) => idx !== i));

  const combined = useMemo(
    () => legs.reduce((acc, l) => acc * (parseFloat(l.price) || 1), 1),
    [legs]
  );

  const submit = async (e) => {
    e.preventDefault();
    try {
      setErr("");
      if (legs.length < 2) throw new Error("Acca needs at least 2 legs");
      await createTipsterAcca(username, {
        stake: Number(stake) || 1,
        legs: legs.map((l) => ({
          fixture_id: Number(l.fixture_id),
          market: l.market,
          price: Number(l.price),
          bookmaker: l.bookmaker || null,
          note: null,
        })),
      });
      nav(`/tipsters/${username}`);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2.message || "Failed to create acca");
    }
  };

  return (
    <div style={{ maxWidth: 820 }}>
      <Link to={`/tipsters/${username}`}>← Back</Link>
      <h2>New Acca for @{username}</h2>

      <div style={{ display: "flex", gap: 8, margin: "8px 0 16px" }}>
        <label>Day:&nbsp;
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>Sport:&nbsp;
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

      {loading ? (
        <div>Loading fixtures…</div>
      ) : (
        <>
          <div style={{ display: "grid", gap: 8 }}>
            {fixtures.map((fx) => (
              <div
                key={`fx-${fx.id}`}
                style={{ display: "flex", alignItems: "center", gap: 8, background: "#0c331f", padding: 8, borderRadius: 8 }}
              >
                <div style={{ fontWeight: 600 }}>{nameFor(fx, "home")}</div>
                <div style={{ opacity: 0.7 }}>vs</div>
                <div style={{ fontWeight: 600 }}>{nameFor(fx, "away")}</div>
                <button onClick={() => addLeg(fx)} style={{ marginLeft: "auto" }}>Add leg</button>
              </div>
            ))}
            {!fixtures.length && (
              <div style={{ opacity: 0.7 }}>
                No fixtures for {day}{sport !== "all" ? ` (${sport})` : ""}.
              </div>
            )}
          </div>

          <h3 style={{ marginTop: 20 }}>Legs ({legs.length})</h3>
          <form onSubmit={submit}>
            {legs.map((l, i) => (
              <div
                key={`${l.fixture_id}-${i}`}
                style={{ display: "grid", gridTemplateColumns: "1fr 140px 110px 110px 28px", gap: 8, alignItems: "center", marginBottom: 8 }}
              >
                <div><strong>{l.home_name}</strong> vs <strong>{l.away_name}</strong></div>
                <select
                  value={l.market}
                  onChange={(e) => {
                    const v = [...legs];
                    v[i] = { ...v[i], market: e.target.value };
                    setLegs(v);
                  }}
                >
                  {markets.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input
                  type="text"
                  value={l.bookmaker}
                  onChange={(e) => {
                    const v = [...legs];
                    v[i] = { ...v[i], bookmaker: e.target.value };
                    setLegs(v);
                  }}
                  placeholder="bet365"
                />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={l.price}
                  onChange={(e) => {
                    const v = [...legs];
                    v[i] = { ...v[i], price: e.target.value };
                    setLegs(v);
                  }}
                />
                <button type="button" onClick={() => rmLeg(i)}>✕</button>
              </div>
            ))}

            <div style={{ display: "flex", gap: 16, marginTop: 12, alignItems: "center" }}>
              <label>Stake:&nbsp;
                <input type="number" min="0.1" step="0.1" value={stake} onChange={(e) => setStake(e.target.value)} />
              </label>
              <div>Combined: <strong>{combined.toFixed(2)}</strong></div>
              <div>Potential Profit: <strong>{(Number(stake || 0) * (combined - 1)).toFixed(2)}</strong></div>
              <button type="submit" className="btnPrimary" style={{ marginLeft: "auto" }}>Create Acca</button>
            </div>
            {err && <div style={{ color: "salmon", marginTop: 8 }}>{err}</div>}
          </form>
        </>
      )}
    </div>
  );
}