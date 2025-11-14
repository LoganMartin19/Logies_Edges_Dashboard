// src/pages/FollowingFeed.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";   // 👈 add useNavigate
import { useAuth } from "../components/AuthGate";
import { fetchFollowingFeed } from "../api";

const number = (x, d = 2) =>
  typeof x === "number" && isFinite(x) ? x.toFixed(d) : "—";

export default function FollowingFeed() {
  const { user, initializing } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();                       // 👈

  useEffect(() => {
    if (!user) {
      setFeed([]);
      setErr("");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await fetchFollowingFeed();
        if (!cancelled) {
          setFeed(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("Failed to load following feed", e);
        const status = e?.response?.status;
        if (!cancelled) {
          if (status === 404) {
            setFeed([]);
            setErr("");
          } else {
            setErr("Could not load feed.");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (initializing) return null;

  // 1️⃣ Not logged in → prompt to log in
  if (!user) {
    return (
      <div className="page">
        <div className="card">
          <h2>Following Feed</h2>
          <p>You need to be logged in to see your following feed.</p>
          <Link to="/login" className="btnPrimary">
            Log in
          </Link>
          <p style={{ marginTop: 8, fontSize: "0.9rem", opacity: 0.8 }}>
            Once you’re logged in, follow tipsters from the{" "}
            <Link to="/tipsters">Tipsters</Link> page and their latest picks
            will appear here.
          </p>
        </div>
      </div>
    );
  }

  const isEmpty = !loading && !err && (!feed || feed.length === 0);

  // 👇 new helper: send pick to BetTracker with prefilled fields
  const handleTrackBet = (item) => {
    const params = new URLSearchParams({
      fixture_id: item.fixture_id ? String(item.fixture_id) : "",
      teams: item.fixture_label || "",
      market: item.market || "",
      bookmaker: item.bookmaker || "",
      price: item.price != null ? String(item.price) : "",
      // if tipster stake is missing, default to 1 unit
      stake: item.stake != null ? String(item.stake) : "1",
      notes: `From @${item.tipster_username}`,
    });

    navigate(`/bets?${params.toString()}`);
  };

  return (
    <div className="page">
      <h2>Following Feed</h2>
      <p style={{ marginBottom: 12, fontSize: "0.9rem", opacity: 0.9 }}>
        Latest picks from tipsters you follow.
      </p>

      {loading && <p>Loading your feed…</p>}
      {err && <p style={{ color: "#f66" }}>{err}</p>}

      {isEmpty && (
        <div className="card">
          <p style={{ marginBottom: 8 }}>
            Your following feed is empty right now.
          </p>
          <p style={{ fontSize: "0.9rem", opacity: 0.9, marginBottom: 16 }}>
            Head to the <Link to="/tipsters">Tipsters</Link> tab and hit{" "}
            <strong>Follow</strong> on any tipster you like. Their latest picks
            will show up here.
          </p>
        </div>
      )}

      {!isEmpty && !loading && (
        <div className="tableWrap">
          <table className="picks">
            <thead>
              <tr>
                <th>Tipster</th>
                <th>Fixture</th>
                <th>Market</th>
                <th>Bookmaker</th>
                <th>Odds</th>
                <th>Stake</th>
                <th>Result</th>
                <th style={{ textAlign: "right" }}>Profit</th>
                <th style={{ textAlign: "right" }}>Track</th> {/* 👈 new */}
              </tr>
            </thead>
            <tbody>
              {feed.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link
                      to={`/tipsters/${item.tipster_username}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      {item.tipster_name} @{item.tipster_username}
                    </Link>
                  </td>
                  <td>{item.fixture_label || "Fixture"}</td>
                  <td>{item.market}</td>
                  <td>{item.bookmaker || "—"}</td>
                  <td>{number(item.price)}</td>
                  <td>{number(item.stake)}</td>
                  <td>{item.result || "—"}</td>
                  <td
                    style={{
                      textAlign: "right",
                      color: (item.profit ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                    }}
                  >
                    {number(item.profit)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btnTrack"
                      onClick={() => handleTrackBet(item)}
                    >
                      Track bet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style jsx="true">{`
        .card {
          background: #0a0f0c;
          border-radius: 12px;
          padding: 16px 20px;
          max-width: 640px;
        }
        .btnPrimary {
          display: inline-block;
          margin-top: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          border: none;
          background: #2e7d32;
          color: #fff;
          text-decoration: none;
          cursor: pointer;
        }
        .tableWrap {
          margin-top: 12px;
          background: #0a0f0c;
          border-radius: 12px;
          overflow-x: auto;
        }
        table.picks {
          width: 100%;
          border-collapse: collapse;
        }
        .picks thead th {
          text-align: left;
          padding: 8px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          font-size: 14px;
          color: #eaf4ed;
          background: rgba(255, 255, 255, 0.06);
          white-space: nowrap;
        }
        .picks td {
          padding: 10px 6px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 14px;
          color: #eaf4ed;
        }
        .btnTrack {
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(46, 125, 50, 0.2);
          color: #eaf4ed;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .btnTrack:hover {
          border-color: rgba(46, 125, 50, 0.7);
          background: rgba(46, 125, 50, 0.35);
        }
      `}</style>
    </div>
  );
}