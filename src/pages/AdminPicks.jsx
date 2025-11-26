// src/pages/AdminPicks.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

// ---------------------------
const todayISO = () => new Date().toISOString().slice(0, 10);
// ---------------------------

const fmtUK = (iso) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
};

const slug = (s = "") =>
  s.normalize("NFKD").replace(/[^\w\s.-]/g, "").trim().replace(/\s+/g, "_").toLowerCase();

const logoUrl = (teamName) => `/logos/${slug(teamName)}.png`;

const TeamChip = ({ name, align = "left" }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
    {align === "left" && (
      <img
        loading="lazy"
        src={logoUrl(name)}
        alt=""
        width={18}
        height={18}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    )}
    <b style={{ fontWeight: 700 }}>{name}</b>
    {align === "right" && (
      <img
        loading="lazy"
        src={logoUrl(name)}
        alt=""
        width={18}
        height={18}
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
    )}
  </span>
);

// =========================================
//            MAIN COMPONENT
// =========================================

export default function AdminPicks() {
  const [day, setDay] = useState(todayISO());
  const [sport, setSport] = useState("all");

  const [fixtures, setFixtures] = useState([]);
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyPickId, setBusyPickId] = useState(null);
  const [err, setErr] = useState("");

  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState({});
  const [bookFilter, setBookFilter] = useState("all");

  const params = useMemo(() => ({ day, sport }), [day, sport]);

  // -------------------------------------
  // LOAD FIXTURES + PICKS
  // -------------------------------------

  const loadAll = async () => {
    setLoading(true);
    setErr("");

    try {
      const [fRes, pRes] = await Promise.all([
        api.get("/api/public/fixtures/daily", { params }),
        api.get("/api/public/picks/daily", { params }),
      ]);

      setFixtures(fRes.data?.fixtures || []);
      setPicks(pRes.data?.picks || []);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [day, sport]); // reload on change

  // -------------------------------------
  // ADD PICK  (now includes premium checkbox)
  // -------------------------------------

  const addPick = async (fixture, form) => {
    const market = form.market.value.trim();
    const bookmaker = form.bookmaker.value.trim() || "bet365";
    const price = parseFloat(form.price.value);
    const note = form.note.value.trim();
    const isPremiumOnly = form.is_premium_only.checked;

    if (!market || !price || isNaN(price)) {
      alert("Market + numeric price required");
      return;
    }

    const payload = {
      day,
      fixture_id: fixture.id,
      sport: "football", // same as your original logic
      market,
      bookmaker,
      price,
      note: note || null,
      edge: null,
      stake: 1.0,
      is_premium_only: isPremiumOnly,
    };

    setBusyPickId("adding");

    try {
      await api.post("/admin/picks", payload);
      form.reset();
      await loadAll();
    } catch (e) {
      alert("Add failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  // -------------------------------------
  // REMOVE PICK
  // -------------------------------------

  const removePick = async (pickId) => {
    if (!window.confirm("Remove pick?")) return;

    setBusyPickId(pickId);
    try {
      await api.delete(`/admin/picks/${pickId}`);
      await loadAll();
    } catch (e) {
      alert("Remove failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  // -------------------------------------
  // SETTLE PICK  (Won / Lost / Void)
  // -------------------------------------

  const settlePick = async (pickId, result) => {
    setBusyPickId(pickId);
    try {
      await api.post(`/admin/picks/${pickId}/settle?result=${result}`);
      await loadAll();
    } catch (e) {
      alert("Settle failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  // -------------------------------------
  // PREMIUM TOGGLE
  // -------------------------------------

  const togglePremium = async (pick, checked) => {
    const payload = {
      day,
      fixture_id: pick.fixture_id,
      sport: pick.sport,
      market: pick.market,
      bookmaker: pick.bookmaker,
      price: pick.price,
      edge: pick.edge,
      note: pick.note,
      stake: pick.stake,
      is_premium_only: checked,
    };

    setBusyPickId(pick.id);
    try {
      await api.post("/admin/picks", payload);
      await loadAll();
    } catch (e) {
      alert("Premium toggle failed: " + (e?.response?.data?.detail || e.message));
    } finally {
      setBusyPickId(null);
    }
  };

  // -------------------------------------
  // For grouping picks by fixture
  // -------------------------------------

  const picksByFixture = useMemo(() => {
    const map = {};
    for (const p of picks) {
      if (!map[p.fixture_id]) map[p.fixture_id] = [];
      map[p.fixture_id].push(p);
    }
    return map;
  }, [picks]);

  const PrefillBtn = ({ f, mkt, book, price }) => (
    <button
      onClick={() => {
        const form = document.getElementById(`pick-form-${f.id}`);
        if (!form) return;
        form.market.value = mkt;
        form.bookmaker.value = book;
        form.price.value = Number(price).toFixed(2);
      }}
      style={{ fontSize: 12 }}
    >
      Use
    </button>
  );

  // -------------------------------------
  // UI STARTS HERE
  // -------------------------------------

  return (
    <div style={{ padding: 16 }}>
      <h2>Admin — Featured Picks</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <label>
          Day: <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
        </label>

        <label>
          Sport:{" "}
          <select value={sport} onChange={(e) => setSport(e.target.value)}>
            <option value="all">All</option>
            <option value="football">Football (Soccer)</option>
            <option value="nfl">NFL</option>
            <option value="nhl">NHL</option>
            <option value="nba">NBA</option>
            <option value="cfb">CFB</option>
          </select>
        </label>

        <button onClick={loadAll}>Refresh</button>
      </div>

      {/* EXISTING PICKS LIST */}
      <h3>Today’s Picks ({picks.length})</h3>

      {picks.map((p) => (
        <div key={p.id} style={{ border: "1px solid #eee", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          <strong>{p.match}</strong> — {fmtUK(p.kickoff_utc)}
          <div>
            Pick: <b>{p.market}</b> @ {p.bookmaker} — {Number(p.price).toFixed(2)}
          </div>

          {/* Premium toggle */}
          <label style={{ display: "block", marginTop: 6 }}>
            <input
              type="checkbox"
              checked={p.is_premium_only || false}
              disabled={busyPickId === p.id}
              onChange={(e) => togglePremium(p, e.target.checked)}
            />{" "}
            Premium only
          </label>

          {/* Settle buttons */}
          <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
            <button onClick={() => settlePick(p.id, "won")} disabled={busyPickId === p.id}>
              Won
            </button>
            <button onClick={() => settlePick(p.id, "lost")} disabled={busyPickId === p.id}>
              Lost
            </button>
            <button onClick={() => settlePick(p.id, "void")} disabled={busyPickId === p.id}>
              Void
            </button>
          </div>

          <button
            style={{ marginTop: 10 }}
            onClick={() => removePick(p.id)}
            disabled={busyPickId === p.id}
          >
            Remove
          </button>
        </div>
      ))}

      {/* FIXTURES WITH ADD FORM */}
      <h3>Fixtures</h3>

      {fixtures.map((f) => (
        <div key={f.id} style={{ borderBottom: "1px solid #eee", paddingBottom: 12, marginBottom: 12 }}>
          <b>
            <TeamChip name={f.home_team} /> vs <TeamChip name={f.away_team} />
          </b>{" "}
          — {fmtUK(f.kickoff_utc)}

          {/* ADD PICK FORM */}
          <form
            id={`pick-form-${f.id}`}
            onSubmit={(e) => {
              e.preventDefault();
              addPick(f, e.target);
            }}
            style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            <input name="market" placeholder="Market" />
            <input name="bookmaker" placeholder="Bookie" />
            <input name="price" inputMode="decimal" placeholder="Odds" />
            <input name="note" placeholder="Note…" />

            {/* PREMIUM CHECKBOX HERE */}
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input type="checkbox" name="is_premium_only" />
              Premium
            </label>

            <button type="submit" disabled={busyPickId === "adding"}>
              {busyPickId === "adding" ? "Adding…" : "Add"}
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}