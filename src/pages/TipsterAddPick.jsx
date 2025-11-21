// src/pages/TipsterAddPick.jsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createTipsterPick, fetchDailyFixtures } from "../api";
import { useAuth } from "../components/AuthGate";

export default function TipsterAddPick() {
  const { username } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  // default to today's date (UTC-ish)
  const todayISO = new Date().toISOString().slice(0, 10);

  const [day, setDay] = useState(todayISO);
  const [fixtures, setFixtures] = useState([]);
  const [loadingFixtures, setLoadingFixtures] = useState(false);

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

  if (!user) {
    return (
      <div style={{ maxWidth: 560 }}>
        <h2>Add Pick</h2>
        <p>You need to be logged in to add a pick.</p>
        <Link to="/login">Go to login</Link>
      </div>
    );
  }

  const update = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
    }));

  // nice formatting for fixture dropdown
  const formatKickoff = (dt) => {
    if (!dt) return "";
    const d = new Date(dt);
    // show local time + short date
    const time = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    const date = d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
    });
    return `${date} · ${time}`;
  };

  // Load fixtures for selected day (football by default)
  useEffect(() => {
    let cancelled = false;

    const loadFixtures = async () => {
      setLoadingFixtures(true);
      try {
        const data = await fetchDailyFixtures(day, "football");
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (Array.isArray(data.fixtures)) list = data.fixtures;
        else if (Array.isArray(data.data)) list = data.data;
        if (!cancelled) setFixtures(list || []);
      } catch (e) {
        console.error("Failed to load fixtures", e);
        if (!cancelled) setFixtures([]);
      } finally {
        if (!cancelled) setLoadingFixtures(false);
      }
    };

    loadFixtures();
    return () => {
      cancelled = true;
    };
  }, [day]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      const payload = {
        fixture_id: Number(form.fixture_id),
        market: form.market.trim(),
        bookmaker: form.bookmaker.trim() || null,
        price: Number(form.price),
        stake: Number(form.stake) || 1.0,
        is_premium_only: !!form.is_premium_only,
      };

      if (!payload.fixture_id || Number.isNaN(payload.fixture_id)) {
        throw new Error("Please select a fixture.");
      }

      await createTipsterPick(username, payload);
      nav(`/tipster/${encodeURIComponent(username)}`);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to add pick");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, padding: 16 }}>
      <h2 style={{ marginBottom: 4 }}>Add Pick</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>
        Posting as <b>@{username}</b>
      </p>

      {err && (
        <div
          style={{
            color: "salmon",
            margin: "10px 0",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid rgba(250,128,114,0.5)",
            background: "rgba(250,128,114,0.08)",
          }}
        >
          {err}
        </div>
      )}

      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        {/* Day selector + fixtures dropdown */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
            gap: 12,
          }}
        >
          <label style={{ display: "block" }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>Day (UTC)</div>
            <input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>

          <label style={{ display: "block" }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>Fixture</div>
            <select
              required
              value={form.fixture_id}
              onChange={update("fixture_id")}
              style={{ width: "100%" }}
            >
              <option value="">
                {loadingFixtures ? "Loading fixtures…" : "Select fixture…"}
              </option>
              {fixtures.map((fx) => (
                <option key={fx.id} value={fx.id}>
                  {formatKickoff(fx.kickoff_utc)} — {fx.home_team} vs{" "}
                  {fx.away_team}
                </option>
              ))}
            </select>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Pulls fixtures for the selected day; shows team names instead of
              raw IDs.
            </div>
          </label>
        </div>

        <label>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Market</div>
          <input
            required
            value={form.market}
            onChange={update("market")}
            placeholder="HOME_WIN / AWAY_WIN / DRAW / O2.5 / BTTS_Y"
          />
        </label>

        <label>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Bookmaker</div>
          <input
            value={form.bookmaker}
            onChange={update("bookmaker")}
            placeholder="bet365"
          />
        </label>

        <label>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Odds (decimal)</div>
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
          <div style={{ fontSize: 13, marginBottom: 4 }}>Stake (units)</div>
          <input
            type="number"
            step="0.1"
            value={form.stake}
            onChange={update("stake")}
            placeholder="1.0"
          />
        </label>

        {/* Premium-only toggle */}
        <div
          style={{
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid rgba(34,197,94,0.4)",
            background: "rgba(22,163,74,0.06)",
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.is_premium_only}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  is_premium_only: e.target.checked,
                }))
              }
              style={{ marginTop: 2 }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                Mark as Premium pick
              </div>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  marginTop: 2,
                }}
              >
                Premium-only picks are visible in feeds but full details are
                unlocked for CSB Premium members (and yourself).
              </div>
            </div>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Post Pick"}
          </button>
          <Link to={`/tipster/${encodeURIComponent(username)}`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}