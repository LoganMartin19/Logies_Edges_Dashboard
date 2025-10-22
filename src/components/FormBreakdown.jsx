// src/components/FormBreakdown.jsx
import React from "react";
import "../styles/FormBreakdown.css";

const FormBreakdown = ({ home, away, homeName = "Home", awayName = "Away", n }) => {
  if (!home || !away) return null;

  const safeNum = (v, d = 0) => (typeof v === "number" && !Number.isNaN(v) ? v : d);
  const formatAvg = (v) => safeNum(v).toFixed(1);

  // ---- helpers to parse goals from a row ----
  const num = (v) => {
    if (v == null) return null;
    if (typeof v === "number") return v;
    const m = String(v).match(/-?\d+/);
    return m ? Number(m[0]) : null;
  };

  const extractTeamPerspectiveGoals = (m) => {
    // Prefer explicit home/away goal fields
    let HG = num(m?.home_goals);
    let AG = num(m?.away_goals);

    // Fallback to "2-1" or "2:1" score strings
    if ((HG == null || AG == null) && m?.score) {
      const mm = String(m.score).match(/(-?\d+)\s*[-:x]\s*(-?\d+)/i);
      if (mm) {
        HG = Number(mm[1]);
        AG = Number(mm[2]);
      }
    }

    if (HG == null || AG == null) return { gf: null, ga: null }; // cannot use row

    // Orient to team perspective using is_home
    if (m?.is_home === true) {
      return { gf: HG, ga: AG };
    } else if (m?.is_home === false) {
      return { gf: AG, ga: HG };
    }
    // Unknown home/away → best effort (don’t flip)
    return { gf: HG, ga: AG };
  };

  const outcomeClass = (gf, ga) => {
    if (gf == null || ga == null) return "draw";
    if (gf > ga) return "win";
    if (gf < ga) return "loss";
    return "draw";
  };

  // --- NEW: recompute summary from recent, fall back to provided summary
  const computeSummary = (recent = [], fallbackSummary = {}) => {
    let w = 0, d = 0, l = 0, gfSum = 0, gaSum = 0, used = 0;

    for (const m of recent) {
      const { gf, ga } = extractTeamPerspectiveGoals(m);
      if (gf == null || ga == null) continue;
      used += 1;
      gfSum += gf; gaSum += ga;
      if (gf > ga) w += 1;
      else if (gf === ga) d += 1;
      else l += 1;
    }

    if (used > 0) {
      return {
        played: used,
        wins: w,
        draws: d,
        losses: l,
        goals_for: gfSum,
        goals_against: gaSum,
        avg_goals_for: gfSum / used,
        avg_goals_against: gaSum / used,
        _source: "recomputed",
      };
    }

    // Fallback to whatever the API/UI gave us originally
    return {
      played: safeNum(fallbackSummary?.played),
      wins: safeNum(fallbackSummary?.wins),
      draws: safeNum(fallbackSummary?.draws),
      losses: safeNum(fallbackSummary?.losses),
      goals_for: safeNum(fallbackSummary?.goals_for),
      goals_against: safeNum(fallbackSummary?.goals_against),
      avg_goals_for: safeNum(fallbackSummary?.avg_goals_for),
      avg_goals_against: safeNum(fallbackSummary?.avg_goals_against),
      _source: "fallback",
    };
  };

  const renderSummary = (teamLabel, recomputed) => {
    const wins = safeNum(recomputed.wins);
    const draws = safeNum(recomputed.draws);
    const losses = safeNum(recomputed.losses);
    const gf = safeNum(recomputed.goals_for);
    const ga = safeNum(recomputed.goals_against);
    const avgGF = formatAvg(recomputed.avg_goals_for);
    const avgGA = formatAvg(recomputed.avg_goals_against);

    return (
      <div className="form-summary">
        <h4>
          {teamLabel}
          {typeof n === "number" ? <span className="form-n">(last {n})</span> : null}
        </h4>
        <p>{wins}W – {draws}D – {losses}L</p>
        <p>
          GF: {gf}, GA: {ga} &nbsp;(Avg GF: {avgGF}, Avg GA: {avgGA})
        </p>
      </div>
    );
  };

  const renderRecent = (recent = []) => (
    <div className="form-recent">
      {recent.map((m, idx) => {
        const { gf, ga } = extractTeamPerspectiveGoals(m);
        const cls = outcomeClass(gf, ga);
        const opponentDisplay = m?.opponent ? `${m?.is_home ? "vs" : "@"} ${m.opponent}` : "";
        const dateShort = m?.date ? m.date.slice(5, 10) : "";
        const comp = m?.comp || m?.league || m?.league_name || "";

        const shownScore = gf != null && ga != null ? `${gf}-${ga}` : (m?.score ?? "-");
        const scoreTitle =
          m?.score && (m?.home_goals == null || m?.away_goals == null)
            ? `Raw score: ${m.score}`
            : undefined;

        return (
          <div key={idx} className={`form-match ${cls}`}>
            <div className="form-match-main">
              <span className="score" title={scoreTitle}>{shownScore}</span>
              <span className="opponent">{opponentDisplay}</span>
              <span className="date">{dateShort}</span>
            </div>
            {comp ? (
              <span className="comp-badge" title={comp}>
                {comp}
              </span>
            ) : null}
          </div>
        );
      })}
      {!recent.length && <div className="form-empty">No recent matches found.</div>}
    </div>
  );

  // Use recomputed summaries so W-D-L / GF-GA match the perspective-flipped rows
  const homeRecent = home.recent || [];
  const awayRecent = away.recent || [];
  const homeSummary = computeSummary(homeRecent, home.summary || home);
  const awaySummary = computeSummary(awayRecent, away.summary || away);

  return (
    <div className="form-breakdown">
      <div className="team-form">
        {renderSummary(homeName, homeSummary)}
        {renderRecent(homeRecent)}
      </div>
      <div className="team-form">
        {renderSummary(awayName, awaySummary)}
        {renderRecent(awayRecent)}
      </div>
    </div>
  );
};

export default FormBreakdown;