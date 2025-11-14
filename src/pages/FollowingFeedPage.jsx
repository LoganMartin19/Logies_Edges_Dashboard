import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchFollowingFeed } from "../api";

const number = (x, d = 2) =>
  typeof x === "number" && isFinite(x) ? x.toFixed(d) : "—";

export default function FollowingFeedPage() {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    fetchFollowingFeed().then(setFeed).catch(() => setFeed([]));
  }, []);

  return (
    <div className="page">
      <h2>Following Feed</h2>
      <p>Latest picks from tipsters you follow.</p>

      {feed.length === 0 && (
        <p style={{ opacity: 0.7, marginTop: 20 }}>
          You’re not following any tipsters yet.
        </p>
      )}

      <div className="tableWrap">
        <table className="picks">
          <thead>
            <tr>
              <th>Tipster</th>
              <th>Fixture</th>
              <th>Market</th>
              <th>Odds</th>
              <th>Result</th>
              <th style={{ textAlign: "right" }}>Profit</th>
            </tr>
          </thead>
          <tbody>
            {feed.map((p) => (
              <tr key={p.pick_id}>
                <td>
                  <Link to={`/tipsters/${p.tipster_username}`}>
                    {p.tipster_name}
                  </Link>
                </td>
                <td>
                  <Link to={`/fixture/${p.fixture_id}`}>
                    {p.fixture_label}
                  </Link>
                </td>
                <td>{p.market}</td>
                <td>{number(p.price)}</td>
                <td>{p.result || "—"}</td>
                <td
                  style={{
                    textAlign: "right",
                    color: (p.profit ?? 0) >= 0 ? "#1db954" : "#d23b3b",
                  }}
                >
                  {number(p.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}