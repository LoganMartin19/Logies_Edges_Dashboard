// src/pages/TipsterAddPick.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createTipsterPick, fetchDailyFixtures } from "../api";
import { useAuth } from "../components/AuthGate";

const todayStr = () => new Date().toISOString().slice(0, 10);

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
    market: "HOME_WIN", // e.g. HOME_WIN / AWAY_WIN / DRAW / O2.5 / BTTS_Y
    bookmaker: "bet365",
    price: "",
    stake: "1.0",
    is_premium_only: false,
  });

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingFixtures, setLoadingFixtures] = useState(false);

  // ---- helpers ----
  const update = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

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
    return `${fmtDate(fx.kickoff_utc)} · ${fmtTime(fx.kickoff_utc)} — ${h} vs ${a}`;
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
        setErr(e?.response?.data?.detail || e.message || "Failed to load fixtures");
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

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      if (!form.fixture_id) {
        throw new Error("Please choose a fixture");
      }
      const payload = {
        fixture_id: Number(form.fixture_id),
        market: form.market.trim(),
        bookmaker: form.bookmaker.trim() || null,
        price: Number(form.price),
        stake: Number(form.stake) || 1.0,
        is_premium_only: !!form.is_premium_only,
      };
      await createTipsterPick(username, payload);
      nav(`/tipsters/${encodeURIComponent(username)}`);
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2.message || "Failed to add pick");
    } finally {
      setSaving(false);
    }
  };

  const markets = ["HOME_WIN", "AWAY_WIN", "DRAW", "BTTS_Y", "BTTS_N", "O2.5", "U2.5"];

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

      {loadingFixtures && (
        <div style={{ marginBottom: 8, opacity: 0.8 }}>Loading fixtures…</div>
      )}

      {err && (
        <div style={{ color: "salmon", margin: "10px 0" }}>{err}</div>
      )}

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
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

        <label>
          Market
          <select
            required
            value={form.market}
            onChange={update("market")}
          >
            {markets.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

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

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Post Pick"}
          </button>
          <Link to={`/tipsters/${encodeURIComponent(username)}`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}