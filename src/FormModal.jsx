  // FormModal.jsx
  import React from "react";
  
  const FormModal = ({ data }) => {
    const renderTeam = (teamName, form, matches, badge) => (
      <div style={{ flex: 1, padding: "12px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
          <img
            src={badge}
            alt={`${teamName} badge`}
            style={{ width: 28, height: 28, marginRight: 8 }}
          />
          <h3 style={{ margin: 0, fontSize: "16px" }}>{teamName}</h3>
        </div>
  
        {/* Summary */}
        <div style={{ fontSize: "13px", color: "#666", marginBottom: "6px" }}>
          {form.wins}W – {form.draws}D – {form.losses}L | GF:{" "}
          {form.avg_goals_for.toFixed(1)} | GA: {form.avg_goals_against.toFixed(1)}
        </div>
  
        {/* Recent matches */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "13px",
          }}
        >
          <thead>
            <tr style={{ background: "#f0f0f0" }}>
              <th style={{ padding: "4px" }}>Date</th>
              <th>Opponent</th>
              <th>Score</th>
              <th>Res</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m, idx) => {
              const bg =
                m.result === "win"
                  ? "#e8f5e9"
                  : m.result === "draw"
                  ? "#fffde7"
                  : "#ffebee";
              return (
                <tr key={idx} style={{ background: bg, textAlign: "center" }}>
                  <td style={{ padding: "4px" }}>{m.date.slice(0, 10)}</td>
                  <td>
                    {m.is_home ? "vs " : "@"} {m.opponent}
                  </td>
                  <td>{m.score}</td>
                  <td>{m.result.toUpperCase()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  
    return (
      <div style={{ display: "flex", gap: "20px", background: "#fafafa", padding: "12px" }}>
        {renderTeam(
          data.home_team,
          data.home_form,
          data.home_recent,
          `/badges/${data.home_team}.png`
        )}
        {renderTeam(
          data.away_team,
          data.away_form,
          data.away_recent,
          `/badges/${data.away_team}.png`
        )}
      </div>
    );
  };
  
  export default FormModal;