// src/components/BetTracker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "../styles/BetTracker.module.css";

const fmt = (n, d = 2) => (n == null || Number.isNaN(+n) ? "—" : (+n).toFixed(d));
const asNum = (v) => (Number.isFinite(+v) ? +v : 0);

export default function BetTracker() {
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

  // 🔗 prefill from URL once (so FixturePage can deep-link to /bets?... )
  const location = useLocation();
  const navigate = useNavigate();
  const prefilledOnce = useRef(false);
  useEffect(() => {
    if (prefilledOnce.current) return;
    const sp = new URLSearchParams(location.search);
    const patch = {};
    // removed "comp" (server doesn't accept it)
    ["fixture_id","teams","market","bookmaker","price","stake","notes"].forEach((k) => {
      const v = sp.get(k);
      if (v != null && v !== "") patch[k] = v;
    });
    if (Object.keys(patch).length) {
      setForm((prev) => ({ ...prev, ...patch }));
      prefilledOnce.current = true;
      navigate("/bets", { replace: true });
    }
  }, [location.search, navigate]);

  const loadBets = () => {
    setLoading(true);
    fetch("http://127.0.0.1:8000/bets.json")
      .then((r) => r.json())
      .then((data) => {
        setBets(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading bets:", err);
        setLoading(false);
      });
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
    try {
      const body = {
        fixture_id: form.fixture_id ? Number(form.fixture_id) : null,
        teams: form.teams || null,
        market: form.market,
        bookmaker: form.bookmaker,
        price: Number(form.price),
        stake: Number(form.stake),
        notes: form.notes || null,
      };
      await fetch("http://127.0.0.1:8000/bets.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
    } finally {
      setSaving(false);
    }
  };

  const settleBet = async (id, result) => {
    await fetch(`http://127.0.0.1:8000/bets/${id}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ result }),
    });
    loadBets();
  };

  const deleteBet = async (id) => {
    if (!window.confirm("Delete this bet?")) return;
    await fetch(`http://127.0.0.1:8000/bets/${id}.json`, { method: "DELETE" });
    loadBets();
  };

  // 🧹 Cleanup buttons — use JSON body per backend (fixes 422)
  const cleanup = async (action, confirmText) => {
    if (!window.confirm(confirmText)) return;
    try {
      await fetch(`http://127.0.0.1:8000/bets/cleanup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch (e) {
      console.error("Cleanup failed:", e);
    } finally {
      loadBets();
    }
  };

  const filtered = useMemo(() => {
    if (filter === "all") return bets;
    if (filter === "pending") return bets.filter((b) => !b.result);
    return bets.filter((b) => (b.result || "").toLowerCase() === filter);
  }, [bets, filter]);

  const stats = useMemo(() => {
    const staked = bets.reduce((acc, b) => acc + asNum(b.stake), 0);
    const returned = bets.reduce((acc, b) => {
      const stake = asNum(b.stake);
      const price = asNum(b.price);
      if ((b.result || "").toUpperCase() === "WON") return acc + stake * price;
      if ((b.result || "").toUpperCase() === "VOID") return acc + stake;
      return acc;
    }, 0);
    const pnl = returned - staked;
    const roi = staked ? (pnl / staked) * 100 : 0;
    const won = bets.filter((b) => (b.result || "").toUpperCase() === "WON").length;
    const lost = bets.filter((b) => (b.result || "").toUpperCase() === "LOST").length;
    const voided = bets.filter((b) => (b.result || "").toUpperCase() === "VOID").length;
    const pending = bets.filter((b) => !b.result).length;
    return { staked, returned, pnl, roi, won, lost, voided, pending };
  }, [bets]);

  // Optional: export CSV of current filtered view
  const exportCSV = () => {
    // removed "comp" from header and rows
    const header = ["id","teams","market","bookmaker","price","stake","result","notes"];
    const rows = filtered.map(b => [
      b.id, b.teams || "", b.market || "", b.bookmaker || "",
      asNum(b.price), asNum(b.stake), b.result || "", (b.notes || "").replace(/[\r\n]+/g, " ")
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bets.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.wrap}>
      <h2>📊 Bet Tracker</h2>

      {/* KPI Summary */}
      <div className={styles.kpis}>
        <div><b>Staked:</b> £{fmt(stats.staked)}</div>
        <div><b>Returned:</b> £{fmt(stats.returned)}</div>
        <div><b>P/L:</b> £{fmt(stats.pnl)}</div>
        <div><b>ROI:</b> {fmt(stats.roi)}%</div>
        <div><b>Record:</b> {stats.won}W / {stats.lost}L / {stats.voided}V / {stats.pending}P</div>
      </div>

      {/* 🧰 Toolbar */}
      <div className={styles.toolbar}>
        <button onClick={exportCSV}>Export CSV</button>
        <button onClick={loadBets}>↻ Refresh</button>
        <span className={styles.sep} />
        <button
          className={styles.btnSoft}
          onClick={() => cleanup("delete_zero_pending", "Delete ALL pending bets with £0 stake?")}
          title="Remove test/fake rows with stake £0 and Pending"
        >
          🧽 Clean £0 Pending
        </button>
        <button
          className={styles.btnWarn}
          onClick={() => cleanup("delete_pending", "Delete ALL pending bets?")}
        >
          ❌ Delete Pending
        </button>
        <button
          className={styles.btnDanger}
          onClick={() => cleanup("delete_all", "⚠️ Delete ALL bets (this cannot be undone)?")}
        >
          💣 Nuke All
        </button>
      </div>

      {/* Add new bet */}
      <form onSubmit={addBet} className={styles.form}>
        <input name="teams" value={form.teams} onChange={handleChange} placeholder="Teams" required />
        <input name="market" value={form.market} onChange={handleChange} placeholder="Market" required />
        <input name="bookmaker" value={form.bookmaker} onChange={handleChange} placeholder="Bookmaker" required />
        <input name="price" value={form.price} onChange={handleChange} placeholder="Odds" required />
        <input name="stake" value={form.stake} onChange={handleChange} placeholder="Stake" required />
        <input name="notes" value={form.notes} onChange={handleChange} placeholder="Notes (optional)" />
        <button disabled={saving}>{saving ? "Saving…" : "Add Bet"}</button>
      </form>

      {/* Filter */}
      <div className={styles.filter}>
        <label>Status:</label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="void">Void</option>
        </select>
      </div>

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
            {filtered.map((b) => (
              <tr key={b.id}>
                <td>{b.teams || "—"}</td>
                <td>{b.market}</td>
                <td>{b.bookmaker}</td>
                <td>{fmt(b.price)}</td>
                <td>£{fmt(b.stake)}</td>
                <td className={b.result ? styles[`r_${(b.result || "").toLowerCase()}`] : styles.r_pending}>
                  {b.result || "Pending"}
                </td>
                <td>
                  <button onClick={() => settleBet(b.id, "won")}>Won</button>
                  <button onClick={() => settleBet(b.id, "lost")}>Lost</button>
                  <button onClick={() => settleBet(b.id, "void")}>Void</button>
                  <button onClick={() => deleteBet(b.id)}>🗑</button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan="7" style={{ opacity: 0.6 }}>No bets found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}