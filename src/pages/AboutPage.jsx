// src/pages/AboutPage.jsx
import React from "react";

export default function AboutPage() {
  return (
    <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto", lineHeight: 1.6 }}>
      <h2>About Logie’s Edges ⚡</h2>

      <p>
        <strong>Logie’s Edges</strong> is a modern value betting and analytics platform built to
        uncover profitable opportunities that the market often misses. It combines live odds,
        statistical models, and AI analysis to estimate the <em>true</em> probabilities behind each
        outcome — helping you identify bets with a long-term mathematical advantage.
      </p>

      <h3 style={{ marginTop: "24px" }}>👋 The Creator</h3>
      <p>
        Hi, I’m <strong>Logie</strong> — a Software Engineering graduate from the
        University of Glasgow and the developer behind Logie’s Edges. My background is in systems
        engineering and data-driven product design, and I’ve spent years building tools that bring
        clarity to complex data. Combining that with a lifelong love of football, the NFL, and
        sports analytics naturally led to this project.
      </p>

      <h3 style={{ marginTop: "24px" }}>📈 What is an “Edge”?</h3>
      <p>
        In betting, an <strong>edge</strong> means having a higher probability of winning than the
        bookmaker’s odds imply. If our model believes a team has a 55% chance of winning but the
        bookmaker’s price suggests only 45%, that difference is your <em>edge</em>. Over time,
        consistently betting when you have positive edges leads to profit — not luck.
      </p>
      <p>
        Logie’s Edges calculates this by converting both model probabilities and bookmaker odds
        into implied percentages, then highlighting where the market underestimates a team or
        outcome. It’s not about guessing — it’s about finding inefficiencies.
      </p>

      <h3 style={{ marginTop: "24px" }}>⚙️ How It Works</h3>
      <ul>
        <li>
          <strong>Data Ingestion:</strong> Real-time fixtures and odds from major APIs like
          API-Football and API-Sports.
        </li>
        <li>
          <strong>Modeling:</strong> Custom statistical models trained on historical form, goal
          rates, league strength, and calibration techniques.
        </li>
        <li>
          <strong>Edge Detection:</strong> Automated comparison of fair odds vs bookmaker prices
          across multiple markets (1X2, BTTS, O/U, and more).
        </li>
        <li>
          <strong>Alerts & Insights:</strong> AI-generated betting analysis and Telegram alerts for
          curated high-value picks.
        </li>
      </ul>

      <h3 style={{ marginTop: "24px" }}>🎯 Mission</h3>
      <p>
        The goal of Logie’s Edges is simple — to make advanced, data-backed betting accessible to
        everyone. No guesswork, no hype, just clear probabilities and disciplined analysis.
      </p>

      <p style={{ marginTop: 24, color: "#666" }}>
        Built in Scotland • Data-driven • For bettors who think in percentages, not predictions.
      </p>

      {/* --- Legal Disclaimer --- */}
      <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />
      <h3>⚖️ Legal & Disclaimer</h3>
      <p style={{ color: "#666", fontSize: "0.95em" }}>
        Logie’s Edges provides sports analytics and statistical insights for informational purposes
        only. We do not provide or facilitate gambling services, and no content on this platform
        constitutes betting advice or a guarantee of outcome.  
        <br /><br />
        Users must be 18+ and are responsible for complying with local gambling laws. Always gamble
        responsibly — see{" "}
        <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer">
          BeGambleAware.org
        </a>
        .  
        <br /><br />
        © {new Date().getFullYear()} Logie’s Edges. All rights reserved.  
        Registered in Scotland (pending).
      </p>
    </div>
  );
}