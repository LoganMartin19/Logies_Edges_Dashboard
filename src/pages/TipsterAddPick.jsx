// src/pages/TipsterAddPick.jsx
import React, { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { createTipsterPick } from "../api";
import { useAuth } from "../components/AuthGate";

export default function TipsterAddPick() {
  const { username } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const [form, setForm] = useState({
    fixture_id: "",
    market: "HOME_WIN",         // e.g. HOME_WIN / AWAY_WIN / DRAW / O2.5 / BTTS_Y
    bookmaker: "bet365",
    price: "",
    stake: "1.0",
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

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
      };
      await createTipsterPick(username, payload);
      nav(`/tipster/${encodeURIComponent(username)}`);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to add pick");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <h2>Add Pick</h2>
      <p style={{ marginTop: -8, opacity: 0.8 }}>Posting as <b>@{username}</b></p>

      {err && <div style={{ color: "salmon", margin: "10px 0" }}>{err}</div>}

      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label>
          Fixture ID
          <input
            required
            value={form.fixture_id}
            onChange={update("fixture_id")}
            placeholder="e.g. 123456"
          />
        </label>

        <label>
          Market
          <input
            required
            value={form.market}
            onChange={update("market")}
            placeholder="HOME_WIN / AWAY_WIN / DRAW / O2.5 / BTTS_Y"
          />
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

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Post Pick"}
          </button>
          <Link to={`/tipster/${encodeURIComponent(username)}`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}