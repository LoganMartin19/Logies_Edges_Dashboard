// src/components/OddsTable.jsx
import React, { useState } from "react";
import styles from "../styles/FixturePage.module.css";

const OddsTable = ({ grouped }) => {
  const [expandedMarkets, setExpandedMarkets] = useState({});

  const toggleMarket = (market) => {
    setExpandedMarkets((p) => ({ ...p, [market]: !p[market] }));
  };

  return (
    <div className={styles.oddsSection}>
      <h3>All Odds</h3>
      {Object.keys(grouped).map((market) => (
        <div key={market} className={styles.oddsMarket}>
          <h4 onClick={() => toggleMarket(market)}>
            {market} {expandedMarkets[market] ? "▲" : "▼"}
          </h4>
          {expandedMarkets[market] && (
            <table className={styles.oddsTable}>
              <thead>
                <tr>
                  <th>Bookmaker</th>
                  <th>Price</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {grouped[market].map((o, i) => {
                  const ts = o.last_seen.endsWith("Z")
                    ? o.last_seen
                    : o.last_seen + "Z";
                  return (
                    <tr key={i}>
                      <td>{o.bookmaker}</td>
                      <td>{o.price}</td>
                      <td>
                        {new Date(ts).toLocaleString(navigator.language, {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
};

export default OddsTable;