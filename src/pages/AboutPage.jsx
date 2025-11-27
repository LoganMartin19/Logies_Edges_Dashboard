// src/pages/AboutPage.jsx
import React from "react";

export default function AboutPage() {
  return (
    <div
      style={{
        padding: "24px",
        maxWidth: 900,
        margin: "0 auto",
        lineHeight: 1.6,
      }}
    >
      <h2>About Chartered Sports Betting 🏛️</h2>

      <p>
        <strong>Chartered Sports Betting (CSB)</strong> is a next-generation
        value betting and analytics platform designed to identify sustainable
        betting edges using live market data, predictive modeling, and
        transparent performance tracking.
        <br />
        Our mission is to bring professionalism, trust, and data integrity to
        the sports betting space — treating it with the same analytical
        discipline found in financial markets.
      </p>

      <h3 style={{ marginTop: "24px" }}>👋 The Founder</h3>
      <p>
        Hi, I’m <strong>Logan</strong> — a Systems Engineer and creator of the
        CSB platform, formerly known as <em>Logie’s Edges</em>. With a
        background in systems engineering and data science, I built CSB to
        combine rigorous statistical modeling with a lifelong passion for sports
        and analytics.
        <br />
        What started as a private betting model has grown into a transparent,
        trackable, and community-driven platform for verified performance.
      </p>

      <h3 style={{ marginTop: "24px" }}>📊 What We Do</h3>
      <ul>
        <li>
          <strong>Value Modeling:</strong> CSB’s in-house algorithms estimate
          fair probabilities for outcomes across football, NFL, and other sports
          using form data, scoring rates, and league strength adjustments.
        </li>
        <li>
          <strong>Market Comparison:</strong> We automatically compare fair odds
          with bookmaker prices across major markets (1X2, BTTS, Over/Under,
          Double Chance, and more) to highlight statistically mispriced edges.
        </li>
        <li>
          <strong>Verified Tipsters:</strong> Every verified user can post picks
          that are tracked automatically — with ROI, win rate, and profit
          publicly displayed on dynamic leaderboards.
        </li>
        <li>
          <strong>Insights & Alerts:</strong> Our data engine powers live
          Telegram alerts and interactive dashboards to surface daily
          high-value opportunities.
        </li>
      </ul>

      <h3 style={{ marginTop: "24px" }}>📈 What is an “Edge”?</h3>
      <p>
        An <strong>edge</strong> is the statistical advantage between your
        estimated probability and the bookmaker’s implied odds.
        <br />
        For example, if our model estimates a 60% win probability but the odds
        imply 50%, that 10% difference is your <em>edge</em>. Over time, betting
        only when you have a positive edge leads to long-term profit — it’s
        math, not luck.
      </p>

      <h3 style={{ marginTop: "24px" }}>🚀 Roadmap & Future Vision</h3>
      <p>
        CSB isn’t just a betting analytics platform — it’s evolving into the
        world’s first{" "}
        <strong>social network for verified sports bettors</strong>.
        <br />
        Our vision is to blend professional analytics with the social energy of
        modern creator platforms.
      </p>

      <ul>
        <li>
          <strong>Verified Tipster Profiles:</strong> Every user will have a
          public record of picks, ROI, and win rate — automatically tracked and
          verified for transparency.
        </li>
        <li>
          <strong>Creator Monetization:</strong> Top performers will be able to
          earn through subscriptions and premium content — inspired by{" "}
          <em>OnlyFans</em> and <em>Substack</em>, where authenticity and
          results drive following.
        </li>
        <li>
          <strong>Community Features:</strong> CSB will introduce a full social
          layer — profiles, watchalongs, live chats, and forums where users can
          discuss picks, matches, and data in real time.
        </li>
        <li>
          <strong>Model Marketplace:</strong> Independent analysts will be able
          to publish their own AI-driven models within CSB, allowing users to
          explore and subscribe to different data approaches.
        </li>
        <li>
          <strong>Advanced Insights:</strong> The original{" "}
          <em>Logie’s Edges</em> model remains at the core of CSB — detecting
          inefficiencies across markets and improving through calibration and
          machine learning.
        </li>
      </ul>

      <p>
        In short, CSB is building a <strong>social betting ecosystem</strong> —
        a transparent, data-driven network where verified bettors, analysts, and
        fans connect through shared performance and insight.
      </p>

      <h3 style={{ marginTop: "24px" }}>🎯 Mission</h3>
      <p>
        The mission of CSB is to make analytical, responsible, and trackable
        betting accessible to all. We’re here to move the betting world away
        from hype and toward measurable, disciplined performance — built on
        data, not guesswork.
      </p>

      <p style={{ marginTop: 24, color: "#666" }}>
        Built in Scotland • Powered by Data • For Bettors Who Think in
        Percentages, Not Predictions.
      </p>

      {/* --- Safer Gambling & Support --- */}
      <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />
      <h3>🧠 Safer Gambling & Support</h3>
      <p style={{ color: "#444", fontSize: "0.95em" }}>
        Betting should always be fun, never stressful. CSB is built around
        data, discipline, and long-term thinking — but no model removes risk.
        There is always a chance of losing money.
      </p>
      <ul style={{ color: "#444", fontSize: "0.95em" }}>
        <li>Only bet what you can afford to lose.</li>
        <li>Set limits on stakes, losses, and how often you bet.</li>
        <li>Never chase losses or “tilt” after a bad run.</li>
        <li>Take regular breaks from betting and from the platform.</li>
        <li>
          If betting starts to feel like a problem, talk to someone and seek
          support early.
        </li>
      </ul>
      <p style={{ color: "#444", fontSize: "0.95em" }}>
        If you’re worried about your gambling, or about someone close to you,
        the following organisations can help:
      </p>
      <ul style={{ color: "#444", fontSize: "0.95em" }}>
        <li>
          <strong>BeGambleAware</strong> – information, tools and support for
          staying in control:{" "}
          <a
            href="https://www.begambleaware.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            begambleaware.org
          </a>
        </li>
        <li>
          <strong>GamCare</strong> – free, confidential help and live chat in
          the UK:{" "}
          <a
            href="https://www.gamcare.org.uk"
            target="_blank"
            rel="noopener noreferrer"
          >
            gamcare.org.uk
          </a>
        </li>
        <li>
          <strong>NHS Gambling Support</strong> – information on treatment and
          support services:{" "}
          <a
            href="https://www.nhs.uk/live-well/addiction-support/gambling-addiction/"
            target="_blank"
            rel="noopener noreferrer"
          >
            NHS: Gambling addiction
          </a>
        </li>
      </ul>
      <p style={{ color: "#666", fontSize: "0.9em" }}>
        If you ever feel gambling is affecting your health, relationships, or
        finances, please pause betting and reach out to one of the services
        above.
      </p>

      {/* --- Legal Disclaimer --- */}
      <hr style={{ margin: "40px 0", borderTop: "1px solid #ddd" }} />
      <h3>⚖️ Legal & Disclaimer</h3>
      <p style={{ color: "#666", fontSize: "0.95em" }}>
        Chartered Sports Betting (CSB) provides sports analytics and
        statistical insights for informational purposes only. We do not offer
        or facilitate gambling services, and no content on this site
        constitutes betting advice or a guarantee of outcome.
        <br />
        <br />
        Users must be 18+ and are responsible for complying with all applicable
        gambling laws. Always bet responsibly — see{" "}
        <a
          href="https://www.begambleaware.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          BeGambleAware.org
        </a>
        .
        <br />
        <br />
        © {new Date().getFullYear()} Chartered Sports Betting (CSB). All rights
        reserved. Registered in Scotland (pending).
      </p>
    </div>
  );
}