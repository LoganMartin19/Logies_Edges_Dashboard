// src/components/BetTracker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "../styles/BetTracker.module.css";
import { api, API_BASE } from "../api"; // axios instance with auth
import { useAuth } from "../components/AuthGate"; // ⭐ premium gating

const fmt = (n, d = 2) =>
  n == null || Number.isNaN(+n) ? "—" : (+n).toFixed(d);
const asNum = (v) => (Number.isFinite(+v) ? +v : 0);

export default function BetTracker() {
  const { isPremium } = useAuth(); // ⭐ know if user is premium

  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    fixture_id: "",
    teams: "",
    market: "",
    bookmaker: "",
    price: "",
    stake: "",
    notes: "",
  });
  const [apiError, setApiError] = useState("");

  // 🔗 prefill from URL once
  const location = useLocation();
  const navigate = useNavigate();
  const prefilledOnce = useRef(false);

  useEffect(() => {
    if (prefilledOnce.current) return;
    const sp = new URLSearchParams(location.search);
    const patch = {};
    [
      "fixture_id",
      "teams",
      "market",
      "bookmaker",
      "price",
      "stake",
      "notes",
    ].forEach((k) => {
      const v = sp.get(k);
      if (v != null && v !== "") patch[k] = v;
    });
    if (Object.keys(patch).length) {
      setForm((prev) => ({ ...prev, ...patch }));
      prefilledOnce.current = true;
      navigate("/bets", { replace: true });
    }
  }, [location.search, navigate]);

  const loadBets = async () => {
    setLoading(true);
    setApiError("");
    try {
      const { data } = await api.get("/api/user-bets"); // per-user bets
      setBets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading bets:", err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setApiError("Please log in to use your bet tracker.");
      } else {
        setApiError(err.message || "Failed to load bets");
      }
      setBets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBets();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addBet = async (e) => {
    e.preventDefault();
    setSaving(true);
    setApiError("");
    try {
      const body = {
        fixture_id: form.fixture_id ? Number(form.fixture_id) : null,
        // 'teams' is UI-only; backend derives from fixture if present
        market: form.market,
        bookmaker: form.bookmaker || null,
        price: Number(form.price),
        stake: Number(form.stake),
        notes: form.notes || null,
      };
      await api.post("/api/user-bets", body);
      setForm({
        fixture_id: "",
        teams: "",
        market: "",
        bookmaker: "",
        price: "",
        stake: "",
        notes: "",
      });
      loadBets();
    } catch (err) {
      console.error("Error adding bet:", err);
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        setApiError("Please log in to add bets to your tracker.");
      } else {
        setApiError(err.message || "Failed to add bet");
      }
    } finally {
      setSaving(false);
    }
  };

  const settleBet = async (id, result) => {
    setApiError("");
    try {
      await api.patch(`/api/user-bets/${id}`, { result }); // "won" | "lost" | "void"
      loadBets();
    } catch (err) {
      console.error("Error settling bet:", err);
      setApiError(err.message || "Failed to settle bet");
    }
  };

  const deleteBet = async (id) => {
    if (!window.confirm("Delete this bet?")) return;
    setApiError("");
    try {
      await api.delete(`/api/user-bets/${id}`);
      loadBets();
    } catch (err) {
      console.error("Error deleting bet:", err);
      setApiError(err.message || "Failed to delete bet");
    }
  };

  const cleanup = async (action, confirmText) => {
    if (!window.confirm(confirmText)) return;
    setApiError("");
    try {
      await api.post("/api/user-bets/cleanup", { action }); // "delete_zero_pending" | "delete_pending" | "delete_all"
    } catch (err) {
      console.error("Cleanup failed:", err);
      setApiError(err.message || "Cleanup failed");
    } finally {
      loadBets();
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return bets;
    if (filter === "pending") return bets.filter((b) => !b.result);
    return bets.filter(
      (b) => (b.result || "").toLowerCase() === filter.toLowerCase()
    );
  }, [bets, filter]);

  // ---------- summary stats ----------
  const stats = useMemo(() => {
    const totalBets = bets.length;

    const staked = bets.reduce((acc, b) => acc + asNum(b.stake), 0);

    const returned = bets.reduce((acc, b) => {
      const stake = asNum(b.stake);
      const price = asNum(b.price);
      const res = (b.result || "").toUpperCase();
      if (res === "WON") return acc + stake * price;
      if (res === "VOID") return acc + stake;
      return acc;
    }, 0);

    const pnl = returned - staked;
    const roi = staked ? (pnl / staked) * 100 : 0;

    const wonBets = bets.filter(
      (b) => (b.result || "").toUpperCase() === "WON"
    );
    const lostBets = bets.filter(
      (b) => (b.result || "").toUpperCase() === "LOST"
    );
    const voidedBets = bets.filter(
      (b) => (b.result || "").toUpperCase() === "VOID"
    );
    const pendingBets = bets.filter((b) => !b.result);

    const settledCount = wonBets.length + lostBets.length;
    const hitRate = settledCount ? (wonBets.length / settledCount) * 100 : 0;

    const avgOdds =
      totalBets > 0
        ? bets.reduce((acc, b) => acc + asNum(b.price), 0) / totalBets
        : 0;

    const avgStake = totalBets ? staked / totalBets : 0;

    return {
      totalBets,
      staked,
      returned,
      pnl,
      roi,
      won: wonBets.length,
      lost: lostBets.length,
      voided: voidedBets.length,
      pending: pendingBets.length,
      hitRate,
      avgOdds,
      avgStake,
    };
  }, [bets]);

  // ---------- helper: detect ACCAs ----------
  const isAccaBet = (b) => {
    const noFixture = !b.fixture_id || Number(b.fixture_id) === 0;
    const bm = (b.bookmaker || "").toUpperCase();
    const mk = (b.market || "").toUpperCase();
    const looksAcca =
      bm === "ACCA" ||
      mk.includes("ACCA") ||
      mk.includes("PARLAY") ||
      mk.includes("MULTI");
    return noFixture && looksAcca;
  };

  // ---------- performance strip (last 15 settled bets) ----------
  const performance = useMemo(() => {
    const settled = bets.filter((b) =>
      ["WON", "LOST", "VOID"].includes((b.result || "").toUpperCase())
    );

    if (!settled.length) {
      return { recent: [] };
    }

    const sorted = [...settled].sort((a, b) => {
      // Prefer created_at if we have it, else fall back to id
      const da = a.created_at ? new Date(a.created_at).getTime() : a.id || 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : b.id || 0;
      return da - db;
    });

    const recent = sorted.slice(-15); // last 15
    return { recent };
  }, [bets]);

  // ---------- P/L chart data (cumulative over time, premium-only) ----------
  const plHistory = useMemo(() => {
    const settled = bets.filter((b) =>
      ["WON", "LOST", "VOID"].includes((b.result || "").toUpperCase())
    );

    if (!settled.length) {
      return { values: [], path: "", lastValue: 0, min: 0, max: 0, zeroY: null };
    }

    const sorted = [...settled].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : a.id || 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : b.id || 0;
      return da - db;
    });

    let running = 0;
    const values = [];
    sorted.forEach((b) => {
      const stake = asNum(b.stake);
      const price = asNum(b.price);
      const res = (b.result || "").toUpperCase();
      let delta = 0;

      if (res === "WON") delta = stake * (price - 1); // net win
      else if (res === "LOST") delta = -stake;        // stake lost
      else if (res === "VOID") delta = 0;

      running += delta;
      values.push(running);
    });

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const span = maxVal - minVal || 1;

    const h = 40;
    const w = 100;
    const pad = 4;

    const coords = values.map((v, idx) => {
      const x =
        values.length === 1
          ? w / 2
          : (idx / (values.length - 1)) * (w - 2 * pad) + pad;
      const y =
        h - pad - ((v - minVal) / span) * (h - 2 * pad); // invert Y
      return { x, y };
    });

    const path = coords
      .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
      .join(" ");

    // y-position for zero line (if 0 within or near range)
    let zeroY = h - pad - ((0 - minVal) / span) * (h - 2 * pad);
    zeroY = Math.max(pad, Math.min(h - pad, zeroY));

    return {
      values,
      path,
      lastValue: values[values.length - 1],
      min: minVal,
      max: maxVal,
      zeroY,
    };
  }, [bets]);

  const exportCSV = () => {
    const header = [
      "id",
      "teams",
      "market",
      "bookmaker",
      "price",
      "stake",
      "result",
      "notes",
    ];
    const rows = filtered.map((b) => {
      const acca = isAccaBet(b);
      const teamsLabel = acca ? b.market || "ACCA" : b.teams || "";
      const marketLabel = acca ? "ACCA" : b.market || "";
      return [
        b.id,
        teamsLabel,
        marketLabel,
        b.bookmaker || "",
        asNum(b.price),
        asNum(b.stake),
        b.result || "",
        (b.notes || "").replace(/[\r\n]+/g, " "),
      ];
    });
    const csv = [header, ...rows]
      .map((r) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bets.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isRemote =
    !API_BASE.includes("127.0.0.1") && !API_BASE.includes("localhost");

  return (
    <div className={styles.wrap}>
      <h2 className={styles.title}>📊 Bet Tracker</h2>

      {/* Info banner */}
      <div className={styles.banner}>
        <b>Per-account tracker:</b>{" "}
        {isRemote
          ? "Log in to start tracking your own bets – they’re tied to your account."
          : "In local dev, make sure Firebase auth is configured so per-user bets work."}
      </div>

      {/* KPI Summary – premium vs free */}
      {isPremium ? (
        // ⭐ PREMIUM: full card-based analytics
        <div className={styles.kpis}>
          <div className={styles.kpiCard || ""}>
            <div className={styles.kpiLabel || ""}>Total Bets</div>
            <div className={styles.kpiValue || ""}>{stats.totalBets}</div>
          </div>
          <div className={styles.kpiCard || ""}>
            <div className={styles.kpiLabel || ""}>Staked</div>
            <div className={styles.kpiValue || ""}>£{fmt(stats.staked)}</div>
          </div>
          <div className={styles.kpiCard || ""}>
            <div className={styles.kpiLabel || ""}>Returned</div>
            <div className={styles.kpiValue || ""}>£{fmt(stats.returned)}</div>
          </div>
          <div
            className={`${styles.kpiCard || ""} ${
              stats.pnl >= 0
                ? styles.kpiPositive || ""
                : styles.kpiNegative || ""
            }`}
          >
            <div className={styles.kpiLabel || ""}>P/L</div>
            <div className={styles.kpiValue || ""}>£{fmt(stats.pnl)}</div>
          </div>
          <div className={styles.kpiCard || ""}>
            <div className={styles.kpiLabel || ""}>ROI</div>
            <div className={styles.kpiValue || ""}>{fmt(stats.roi)}%</div>
          </div>
          <div className={styles.kpiCard || ""}>
            <div className={styles.kpiLabel || ""}>Record</div>
            <div className={styles.kpiValue || ""}>
              {stats.won}W / {stats.lost}L / {stats.voided}V / {stats.pending}P
            </div>
          </div>
          <div className={styles.kpiCard || ""}>
            <div className={styles.kpiLabel || ""}>Hit Rate (settled)</div>
            <div className={styles.kpiValue || ""}>
              {fmt(stats.hitRate)}%
            </div>
          </div>
          <div className={styles.kpiCard || ""}>
            <div className={styles.kpiLabel || ""}>Avg Odds</div>
            <div className={styles.kpiValue || ""}>{fmt(stats.avgOdds)}</div>
          </div>
          <div className={styles.kpiCard || ""}>
            <div className={styles.kpiLabel || ""}>Avg Stake</div>
            <div className={styles.kpiValue || ""}>
              £{fmt(stats.avgStake)}
            </div>
          </div>
        </div>
      ) : (
        // 🆓 FREE: simple text row (feels more basic)
        <div className={styles.kpis}>
          <div>
            <b>Staked:</b> £{fmt(stats.staked)}
          </div>
          <div>
            <b>Returned:</b> £{fmt(stats.returned)}
          </div>
          <div>
            <b>P/L:</b> £{fmt(stats.pnl)}
          </div>
          <div>
            <b>ROI:</b> {fmt(stats.roi)}%
          </div>
          <div>
            <b>Record:</b> {stats.won}W / {stats.lost}L / {stats.voided}V /{" "}
            {stats.pending}P
          </div>
        </div>
      )}

      {/* Performance strip – ⭐ PREMIUM ONLY */}
      {isPremium && performance.recent.length > 0 && (
        <div className={styles.performance || ""} style={{ marginBottom: 10 }}>
          <div
            className={styles.performanceHeader || ""}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.82rem",
              marginBottom: 4,
              opacity: 0.9,
            }}
          >
            <span>Recent form</span>
            <span className={styles.performanceMeta || ""}>
              Last {performance.recent.length} settled bets
            </span>
          </div>
          <div
            className={styles.performanceDots || ""}
            style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
          >
            {performance.recent.map((b) => {
              const res = (b.result || "").toUpperCase();
              let cls = styles.dotPending || "";
              if (res === "WON") cls = styles.dotWon || "";
              else if (res === "LOST") cls = styles.dotLost || "";
              else if (res === "VOID") cls = styles.dotVoid || "";

              return (
                <span
                  key={b.id}
                  className={cls}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background:
                      res === "WON"
                        ? "#34a853"
                        : res === "LOST"
                        ? "#d23b3b"
                        : res === "VOID"
                        ? "#f5e6b8"
                        : "rgba(234,244,237,0.6)",
                  }}
                  title={`${b.teams || b.market || "Bet"} – ${
                    res || "PENDING"
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ⭐ PREMIUM ONLY – Cumulative P/L chart */}
      {isPremium && plHistory.values.length > 1 && (
        <div
          className={styles.plBlock || ""}
          style={{
            marginBottom: 14,
            marginTop: 2,
          }}
        >
          <div
            className={styles.plHeader || ""}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.82rem",
              marginBottom: 4,
              opacity: 0.9,
            }}
          >
            <span>P/L over time</span>
            <span className={styles.plMeta || ""}>
              Net:&nbsp;<b>£{fmt(plHistory.lastValue)}</b>
            </span>
          </div>
          <svg
            viewBox="0 0 100 40"
            preserveAspectRatio="none"
            style={{
              width: "100%",
              height: 60,
              background: "rgba(0,0,0,0.55)",
              borderRadius: 8,
            }}
          >
            {/* zero axis */}
            {plHistory.zeroY != null && (
              <line
                x1="0"
                x2="100"
                y1={plHistory.zeroY}
                y2={plHistory.zeroY}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="0.4"
              />
            )}
            {/* P/L line */}
            <path
              d={plHistory.path}
              fill="none"
              stroke={
                plHistory.lastValue >= 0 ? "#34a853" : "#d23b3b"
              }
              strokeWidth="1.2"
            />
          </svg>
        </div>
      )}

      {/* 🧰 Toolbar */}
      <div className={styles.toolbar}>
        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={loadBets}>↻ Refresh</button>
        <span className={styles.sep} />
        <button
          className={styles.btnSoft}
          onClick={() =>
            cleanup(
              "delete_zero_pending",
              "Delete ALL pending bets with £0 stake from your account?"
            )
          }
          title="Remove test/fake rows with stake £0 and Pending"
        >
          🧽 Clean £0 Pending
        </button>
        <button
          className={styles.btnWarn}
          onClick={() =>
            cleanup(
              "delete_pending",
              "Delete ALL pending bets from your account?"
            )
          }
        >
          ❌ Delete Pending
        </button>
        <button
          className={styles.btnDanger}
          onClick={() =>
            cleanup(
              "delete_all",
              "⚠️ Delete ALL bets in your tracker (cannot be undone)?"
            )
          }
        >
          💣 Nuke All
        </button>
      </div>

      {/* Add new bet */}
      <form onSubmit={addBet} className={styles.form}>
        {/* teams is UI-only for now */}
        <input
          name="teams"
          value={form.teams}
          onChange={handleChange}
          placeholder="Teams (for your reference)"
        />
        <input
          name="market"
          value={form.market}
          onChange={handleChange}
          placeholder="Market"
          required
        />
        <input
          name="bookmaker"
          value={form.bookmaker}
          onChange={handleChange}
          placeholder="Bookmaker"
        />
        <input
          name="price"
          value={form.price}
          onChange={handleChange}
          placeholder="Odds"
          required
        />
        <input
          name="stake"
          value={form.stake}
          onChange={handleChange}
          placeholder="Stake"
          required
        />
        <input
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Notes (optional)"
        />
        <button disabled={saving}>{saving ? "Saving…" : "Add Bet"}</button>
      </form>

      {/* Filter */}
      <div className={styles.filter}>
        <label>Status:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="void">Void</option>
        </select>
      </div>

      {/* API error (non-blocking) */}
      {apiError && (
        <p style={{ color: "#c00", marginTop: 8 }}>{apiError}</p>
      )}

      {/* Table */}
      {loading ? (
        <p>Loading bets…</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Teams</th>
              <th>Market</th>
              <th>Bookmaker</th>
              <th>Odds</th>
              <th>Stake</th>
              <th>Result</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const acca = isAccaBet(b);
              const teamsLabel = acca ? b.market || "ACCA" : b.teams || "—";
              const marketLabel = acca ? "ACCA" : b.market || "—";

              return (
                <tr key={b.id}>
                  <td>{teamsLabel}</td>
                  <td>{marketLabel}</td>
                  <td>{b.bookmaker}</td>
                  <td>{fmt(b.price)}</td>
                  <td>£{fmt(b.stake)}</td>
                  <td
                    className={
                      b.result
                        ? styles[`r_${(b.result || "").toLowerCase()}`]
                        : styles.r_pending
                    }
                  >
                    {b.result || "Pending"}
                  </td>
                  <td>
                    <button onClick={() => settleBet(b.id, "won")}>
                      Won
                    </button>
                    <button onClick={() => settleBet(b.id, "lost")}>
                      Lost
                    </button>
                    <button onClick={() => settleBet(b.id, "void")}>
                      Void
                    </button>
                    <button onClick={() => deleteBet(b.id)}>🗑</button>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan="7" style={{ opacity: 0.6 }}>
                  No bets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}