// src/components/ShortlistSendPanel.jsx
import React, { useEffect, useMemo, useState } from "react";

export default function ShortlistSendPanel() {
  const [rows, setRows] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState({ league: "All", book: "All", onlyNew: false });

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetch("http://127.0.0.1:8000/shortlist/today?hours_ahead=48&min_edge=0&send_alerts=0")
      .then(r => r.json())
      .then(j => { if (live) setRows(Array.isArray(j) ? j : []); })
      .catch(() => { if (live) setRows([]); })
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  const leagues = useMemo(() => ["All", ...Array.from(new Set(rows.map(r => r.comp)))], [rows]);
  const books = useMemo(() => ["All", ...Array.from(new Set(rows.map(r => r.bookmaker)))], [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filter.league !== "All" && r.comp !== filter.league) return false;
      if (filter.book !== "All" && r.bookmaker !== filter.book) return false;
      if (filter.onlyNew && r.already_sent) return false;
      return true;
    });
  }, [rows, filter]);

  const toggle = (hash) => {
    const next = new Set(sel);
    if (next.has(hash)) next.delete(hash);
    else next.add(hash);
    setSel(next);
  };

  const sendSelected = async () => {
    const items = filtered
      .filter(r => sel.has(r.alert_hash))
      .map(r => ({
        fixture_id: r.fixture_id,
        market: r.market,
        bookmaker: r.bookmaker,
        price: r.price,
        alert_payload: r.alert_payload, // already assembled by server
      }));
    if (!items.length) return;
    setSending(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/shortlist/send-batch", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ items, dry_run: false }),
      });
      const j = await res.json();
      // Refresh list to update duplicate flags
      const ref = await fetch("http://127.0.0.1:8000/shortlist/today?hours_ahead=48&min_edge=0&send_alerts=0");
      const next = await ref.json();
      setRows(Array.isArray(next) ? next : []);
      // clear selection for those sent
      setSel(new Set());
      console.log("Batch result:", j);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div style={{margin:"8px 0"}}>Loading shortlist…</div>;

  return (
    <div style={{ border: "1px solid #eee", borderRadius: 8, padding: 12, marginBottom: 16 }}>
      <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:8}}>
        <b>Shortlist (review & send)</b>
        <label>
          League:&nbsp;
          <select value={filter.league} onChange={e => setFilter(f => ({...f, league: e.target.value}))}>
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label>
          Book:&nbsp;
          <select value={filter.book} onChange={e => setFilter(f => ({...f, book: e.target.value}))}>
            {books.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </label>
        <label title="Hide edges we’ve already sent to Telegram">
          <input
            type="checkbox"
            checked={filter.onlyNew}
            onChange={e => setFilter(f => ({...f, onlyNew: e.target.checked}))}
          />
          &nbsp;Only new
        </label>
        <button onClick={sendSelected} disabled={sending || !Array.from(sel).length}>
          {sending ? "Sending…" : `Send selected (${sel.size})`}
        </button>
      </div>

      <div style={{maxHeight: 420, overflow:"auto"}}>
        <table style={{width:"100%", borderCollapse:"collapse", fontSize:13}}>
          <thead>
            <tr style={{textAlign:"left", borderBottom:"1px solid #eee"}}>
              <th></th>
              <th>Kickoff</th>
              <th>Match</th>
              <th>League</th>
              <th>Market</th>
              <th>Book</th>
              <th>Odds</th>
              <th>Model p</th>
              <th>Edge</th>
              <th>Sent?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const id = r.alert_hash;
              const kickoff = new Date(
                (r.kickoff_utc.endsWith("Z") ? r.kickoff_utc : r.kickoff_utc + "Z")
              ).toLocaleString();
              return (
                <tr key={id} style={{borderBottom:"1px solid #f3f3f3"}}>
                  <td>
                    <input
                      type="checkbox"
                      checked={sel.has(id)}
                      onChange={() => toggle(id)}
                      disabled={r.already_sent}
                      title={r.already_sent ? "Already sent" : "Select to send"}
                    />
                  </td>
                  <td>{kickoff}</td>
                  <td>{r.home_team} v {r.away_team}</td>
                  <td>{r.comp}</td>
                  <td>{r.market}</td>
                  <td>{r.bookmaker}</td>
                  <td>{Number(r.price).toFixed(2)}</td>
                  <td>{(Number(r.prob)*100).toFixed(1)}%</td>
                  <td>{(Number(r.edge)*100).toFixed(1)}%</td>
                  <td style={{color: r.already_sent ? "#0a0" : "#999"}}>
                    {r.already_sent ? "Yes" : "No"}
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr><td colSpan={10} style={{opacity:0.7, padding:8}}>No edges match the filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}