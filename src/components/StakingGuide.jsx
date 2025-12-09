// src/components/StakingGuide.jsx
import React, { useMemo, useState } from "react";

export default function StakingGuide() {
  const [bankroll, setBankroll] = useState("");
  const [risk, setRisk] = useState("standard"); // conservative | standard | aggressive

  const { unitSize, unitPct } = useMemo(() => {
    const br = parseFloat(bankroll);
    if (!br || br <= 0) return { unitSize: 0, unitPct: 0 };

    // simple mapping:
    // - conservative: 0.5% per unit
    // - standard:    0.75% per unit
    // - aggressive:  1% per unit
    let pct = 0.0075;
    if (risk === "conservative") pct = 0.005;
    if (risk === "aggressive") pct = 0.01;

    return { unitSize: br * pct, unitPct: pct * 100 };
  }, [bankroll, risk]);

  const fmtMoney = (x) =>
    !x || !isFinite(x) ? "—" : `£${x.toFixed(2)}`;

  return (
    <div
      style={{
        marginTop: 16,
        marginBottom: 20,
        padding: 12,
        borderRadius: 12,
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        fontSize: 13,
        color: "#eaf4ed",
      }}
    >
      <details open>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
            listStyle: "none",
          }}
        >
          📚 Bankroll & Staking Guide
        </summary>

        <div style={{ marginTop: 10, lineHeight: 1.5 }}>
          {/* 1. Bankroll basics */}
          <p style={{ fontWeight: 600 }}>1. Bankroll basics</p>
          <ul style={{ paddingLeft: "1.1rem", margin: "4px 0 8px" }}>
            <li>
              Only bet with money you can afford to lose. Treat your{" "}
              <b>bankroll</b> as a separate pot for betting.
            </li>
            <li>
              A common rule: <b>1 unit = 0.5–1% of bankroll</b>.  
              If your bankroll is £1,000, then 1u ≈ £5–£10.
            </li>
            <li>Don’t chase losses – stakes stay based on bankroll, not mood.</li>
          </ul>

          {/* 2. Quick staking calculator */}
          <p style={{ fontWeight: 600, marginTop: 10 }}>
            2. Quick staking calculator
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              margin: "4px 0 10px",
            }}
          >
            <label style={{ fontSize: 13 }}>
              Bankroll (£):{" "}
              <input
                type="number"
                min="0"
                value={bankroll}
                onChange={(e) => setBankroll(e.target.value)}
                style={{
                  marginLeft: 4,
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#eaf4ed",
                  width: 110,
                }}
              />
            </label>

            <label style={{ fontSize: 13 }}>
              Risk profile:{" "}
              <select
                value={risk}
                onChange={(e) => setRisk(e.target.value)}
                style={{
                  marginLeft: 4,
                  padding: "4px 6px",
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(0,0,0,0.3)",
                  color: "#eaf4ed",
                }}
              >
                <option value="conservative">Conservative</option>
                <option value="standard">Standard</option>
                <option value="aggressive">Aggressive</option>
              </select>
            </label>
          </div>

          {unitSize > 0 ? (
            <div
              style={{
                borderRadius: 10,
                padding: 10,
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.1)",
                marginBottom: 10,
              }}
            >
              <p style={{ margin: "0 0 6px" }}>
                With a bankroll of <b>{fmtMoney(parseFloat(bankroll))}</b> and a{" "}
                <b>{risk}</b> risk profile:
              </p>
              <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
                <li>
                  Recommended <b>1 unit ≈ {fmtMoney(unitSize)}</b> (
                  {unitPct.toFixed(2)}% of bankroll)
                </li>
              </ul>

              <p style={{ margin: "8px 0 4px" }}>
                Example stakes based on edge (just a guide):
              </p>
              <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
                <li>
                  Small edge (&lt; 3%) → <b>0.25u</b> ≈{" "}
                  {fmtMoney(unitSize * 0.25)}
                </li>
                <li>
                  Solid edge (3–7%) → <b>0.5–1u</b> ≈{" "}
                  {fmtMoney(unitSize * 0.5)} – {fmtMoney(unitSize * 1)}
                </li>
                <li>
                  Big edge (&gt; 7%) → <b>1–1.5u max</b> ≈{" "}
                  {fmtMoney(unitSize * 1)} – {fmtMoney(unitSize * 1.5)}
                </li>
              </ul>
            </div>
          ) : (
            <p style={{ opacity: 0.8, fontSize: 12, marginBottom: 10 }}>
              Enter your bankroll to see a suggested unit size and example stakes.
            </p>
          )}

          {/* 3. Kelly Criterion explainer */}
          <p style={{ fontWeight: 600, marginTop: 8 }}>
            3. Kelly Criterion (advanced)
          </p>
          <p>
            Kelly suggests an “optimal” stake based on your edge. It can grow
            bankroll fastest in theory, but it’s <b>very aggressive</b> and can
            swing your balance a lot.
          </p>
          <p style={{ fontFamily: "monospace", fontSize: 12 }}>
            Kelly fraction = (p · (odds − 1) − (1 − p)) / (odds − 1)
          </p>
          <ul style={{ paddingLeft: "1.1rem", margin: "4px 0 8px" }}>
            <li>
              <b>p</b> = your true win probability (e.g. 0.55 for 55%)
            </li>
            <li>
              <b>odds</b> = decimal odds (e.g. 2.10)
            </li>
          </ul>
          <p>
            Most serious bettors use <b>½ Kelly or ¼ Kelly</b> to calm volatility.
            Example: if full Kelly says 8% of bankroll, ¼ Kelly = 2%.
          </p>

          {/* 4. CSB recommendation */}
          <p style={{ fontWeight: 600, marginTop: 8 }}>
            4. CSB recommendation
          </p>
          <ul style={{ paddingLeft: "1.1rem", margin: "4px 0" }}>
            <li>Start with simple unit staking, not full Kelly.</li>
            <li>
              Consider fractional Kelly only if you’re experienced and happy with
              swings.
            </li>
            <li>
              If betting stops being fun or feels out of control,{" "}
              <b>stop immediately</b> and seek help.
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}