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
  const [isPremium, setIsPremium] = useState(false);
  const [isSubscriberOnly, setIsSubscriberOnly] = useState(false); // ⭐ NEW

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

  const markets = [
    "HOME_WIN",
    "AWAY_WIN",
    "DRAW",
    "BTTS_Y",
    "BTTS_N",
    "O2.5",
    "U2.5",
  ];

  // -------- add/remove legs --------
  const addLeg = (fx) => {
    const h = fx.home_team ?? fx.home_name ?? "Home";
    const a = fx.away_team ?? fx.away_name ?? "Away";
    setLegs((prev) => [
      ...prev,
      {
        fixture_id: fx.id,
        market: "HOME_WIN",
        price: 2.0,
        bookmaker: "bet365",
        home_name: h,
        away_name: a,
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

      await createTipsterAcca(username, {
        // note: adjust key name here if your API expects stake_units instead of stake
        stake: parseFloat(stake) || 1,
        is_premium_only: isPremium,
        is_subscriber_only: isSubscriberOnly, // ⭐ NEW
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
      setErr(
        e2?.response?.data?.detail || e2.message || "Failed to create acca"
      );
    }
  };

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
                  display: "grid",
                  gridTemplateColumns:
                    "1fr 130px 110px 110px 30px",
                  gap: 10,
                  alignItems: "center",
                  marginBottom: 8,
                  background: "#04210F",
                  padding: 8,
                  borderRadius: 8,
                }}
              >
                <div>
                  <strong>{l.home_name}</strong> vs{" "}
                  <strong>{l.away_name}</strong>
                </div>

                <select
                  value={l.market}
                  onChange={(e) => {
                    const v = [...legs];
                    v[i].market = e.target.value;
                    setLegs(v);
                  }}
                >
                  {markets.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>

                <input
                  value={l.bookmaker}
                  onChange={(e) => {
                    const v = [...legs];
                    v[i].bookmaker = e.target.value;
                    setLegs(v);
                  }}
                  placeholder="bet365"
                />

                <input
                  type="number"
                  step="0.01"
                  value={l.price}
                  onChange={(e) => {
                    const v = [...legs];
                    v[i].price = e.target.value;
                    setLegs(v);
                  }}
                />

                <button type="button" onClick={() => rmLeg(i)}>
                  ✕
                </button>
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

            {/* Subscriber-only ACCA toggle – NEW */}
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