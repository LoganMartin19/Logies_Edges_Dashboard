import React from "react";
import { Link } from "react-router-dom";

export default function SiteFooterDisclaimer({
  variant = "short", // "short" | "full"
  style = {},
}) {
  const base = {
    marginTop: 18,
    paddingTop: 14,
    borderTop: "1px solid rgba(255,255,255,.10)",
    fontSize: 12,
    lineHeight: 1.35,
    opacity: 0.92,
    ...style,
  };

  // Short footer (use on every page)
  if (variant === "short") {
    return (
      <footer style={base}>
        <div style={{ fontWeight: 700 }}>18+ • Gamble responsibly</div>

        <div style={{ marginTop: 6 }}>
          Chartered Sports Betting (CSB) provides sports analytics, statistical insights,
          and model-driven picks for <b>informational purposes only</b>.
          Content does not constitute financial advice and <b>no outcomes are guaranteed</b>.
          Past performance is not indicative of future results.
        </div>

        <div style={{ marginTop: 6 }}>
          Support:{" "}
          <a href="https://www.begambleaware.org" target="_blank" rel="noreferrer">
            BeGambleAware
          </a>
          {" • "}
          <a href="https://www.gamcare.org.uk" target="_blank" rel="noreferrer">
            GamCare
          </a>
          {" • "}
          <a
            href="https://www.nhs.uk/live-well/addiction-support/gambling-addiction/"
            target="_blank"
            rel="noreferrer"
          >
            NHS
          </a>
          {" • "}
          <Link to="/about" style={{ textDecoration: "underline" }}>
            Full info
          </Link>
        </div>
      </footer>
    );
  }

  // Full block (use on About or a dedicated page)
  return (
    <footer style={base}>
      <div style={{ fontWeight: 800, fontSize: 14 }}>Safer Gambling &amp; Support</div>

      <div style={{ marginTop: 8 }}>
        Betting should always be fun, never stressful. CSB is built around data,
        discipline, and long-term thinking — but no model removes risk.
        There is always a chance of losing money.
      </div>

      <ul style={{ marginTop: 10, paddingLeft: 18 }}>
        <li>Only bet what you can afford to lose.</li>
        <li>Set limits on stakes, losses, and how often you bet.</li>
        <li>Never chase losses or “tilt” after a bad run.</li>
        <li>Take regular breaks from betting and from the platform.</li>
        <li>If gambling starts to feel like a problem, seek support early.</li>
      </ul>

      <div style={{ marginTop: 8 }}>
        UK support:{" "}
        <a href="https://www.begambleaware.org" target="_blank" rel="noreferrer">
          BeGambleAware.org
        </a>
        {" • "}
        <a href="https://www.gamcare.org.uk" target="_blank" rel="noreferrer">
          GamCare.org.uk
        </a>
        {" • "}
        <a
          href="https://www.nhs.uk/live-well/addiction-support/gambling-addiction/"
          target="_blank"
          rel="noreferrer"
        >
          NHS Gambling Addiction
        </a>
      </div>

      <div style={{ marginTop: 14, fontWeight: 800, fontSize: 14 }}>
        Legal &amp; Disclaimer
      </div>

      <div style={{ marginTop: 8 }}>
        Chartered Sports Betting (CSB) provides sports analytics, statistical insights,
        and model-driven picks for informational purposes only.
        We do not place bets on behalf of users or facilitate gambling services.
        No guarantees of outcome are made.
      </div>

      <div style={{ marginTop: 8 }}>
        Users must be 18+ and are responsible for complying with applicable gambling laws.
      </div>
    </footer>
  );
}