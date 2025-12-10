import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api"; // ✅ env-based axios client
import { useAuth } from "../components/AuthGate"; // 🔐 auth + premium
import PremiumUpsellBanner from "../components/PremiumUpsellBanner"; // 🔒 upsell
import styles from "../styles/PlayerPropsSection.module.css";

function fmtPct(p) {
  if (p == null || Number.isNaN(p)) return "—";
  return `${(p * 100).toFixed(1)}%`;
}
function fmtOdds(o) {
  if (o == null || !Number.isFinite(o)) return "—";
  return o >= 100 ? o.toFixed(0) : o.toFixed(2);
}
function fmtEdge(e) {
  if (e == null || !Number.isFinite(e)) return "—";
  return `${(e * 100).toFixed(1)}%`;
}
function fmtNum(x, d = 2) {
  if (x == null || !Number.isFinite(x)) return "—";
  return Number(x).toFixed(d);
}

const MARKET_LABELS = {
  "shots_over_1.5": "Shots O 1.5",
  "sot_over_0.5": "SoT O 0.5",
  "fouls_over_0.5": "Fouls O 0.5",
  "fouls_drawn_over_0.5": "Fouls drawn O 0.5", // 👈 NEW
  "to_be_booked": "To be booked",
};

export default function PlayerPropsSection({
  fixtureId,
  homeTeam,
  awayTeam,
  initialSearch = "",
  restrictToPlayer = false,
}) {
  const { user, isPremium } = useAuth(); // 🔑 who you are + premium flag

  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamFilter, setTeamFilter] = useState("All");
  const [marketFilter, setMarketFilter] = useState("All");
  const [search, setSearch] = useState(initialSearch);
  const [expanded, setExpanded] = useState(null);
  const [err, setErr] = useState("");
  const [locked, setLocked] = useState(false); // 🔒 premium-locked state

  // keep search in sync when parent changes (switching player)
  useEffect(() => {
    setSearch(initialSearch || "");
  }, [initialSearch]);

  useEffect(() => {
    if (!fixtureId) return;

    // 🔒 If not logged in or not premium → don't even bother calling API
    if (!user || !isPremium) {
      setLocked(true);
      setRaw([]);
      setLoading(false);
      setErr("");
      return;
    }

    let alive = true;
    setLoading(true);
    setErr("");
    setLocked(false);

    api
      .get("/football/player-props/fair", { params: { fixture_id: fixtureId } })
      .then(({ data }) => {
        if (!alive) return;
        setRaw(Array.isArray(data?.props) ? data.props : []);
      })
      .catch((e) => {
        if (!alive) return;
        console.error("Failed to load player prop fairs:", e);
        const status = e?.response?.status;
        if (status === 401 || status === 403) {
          // backend premium gate → treat as locked
          setLocked(true);
          setRaw([]);
          setErr("");
        } else {
          setErr("Failed to load player props.");
          setRaw([]);
        }
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [fixtureId, user, isPremium]);

  // Add a nice display name for team
  const enriched = useMemo(
    () =>
      (raw || []).map((r) => ({
        ...r,
        teamDisplay:
          r.team ||
          (r.team_side === "home"
            ? homeTeam || "Home"
            : r.team_side === "away"
            ? awayTeam || "Away"
            : "—"),
      })),
    [raw, homeTeam, awayTeam]
  );

  const teamOptions = useMemo(() => {
    const set = new Set();
    enriched.forEach((r) => r.teamDisplay && set.add(r.teamDisplay));
    return ["All", ...Array.from(set).sort()];
  }, [enriched]);

  const marketOptions = useMemo(() => {
    const present = new Set(enriched.map((r) => r.market));
    return [
      "All",
      ...Object.keys(MARKET_LABELS).filter((k) => present.has(k)),
    ];
  }, [enriched]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return enriched
      .filter((r) =>
        restrictToPlayer && initialSearch
          ? (r.player || "")
              .toLowerCase()
              .includes(initialSearch.toLowerCase())
          : true
      )
      .filter((r) =>
        teamFilter === "All" ? true : r.teamDisplay === teamFilter
      )
      .filter((r) => (marketFilter === "All" ? true : r.market === marketFilter))
      .filter((r) =>
        s ? (r.player || "").toLowerCase().includes(s) : true
      )
      .sort(
        (a, b) =>
          (b.edge || 0) - (a.edge || 0) ||
          (b.prob || 0) - (a.prob || 0) ||
          (a.player || "").localeCompare(b.player || "")
      );
  }, [enriched, teamFilter, marketFilter, search, restrictToPlayer, initialSearch]);

  const explain = (r) => {
    const mins = r.proj_minutes ?? 75;
    const p = r.prob ?? null;
    const fair = r.fair_odds ?? null;

    // opponent + ref context (gracefully handles missing data)
    const opponentTeamName =
      r.team_side === "home"
        ? awayTeam || "Away"
        : r.team_side === "away"
        ? homeTeam || "Home"
        : "—";

    const oppFoulsDrawn90 = Number.isFinite(r.opp_fouls_drawn_per90)
      ? r.opp_fouls_drawn_per90
      : null;
    const oppFoulsCommitted90 = Number.isFinite(
      r.opp_fouls_committed_per90
    )
      ? r.opp_fouls_committed_per90
      : null;
    const refFactor = Number.isFinite(r.ref_factor) ? r.ref_factor : null;

    const maybeContextBits = [];
    if (oppFoulsDrawn90 != null)
      maybeContextBits.push(
        `Opp fouls drawn/90: ${fmtNum(oppFoulsDrawn90)}`
      );
    if (oppFoulsCommitted90 != null)
      maybeContextBits.push(
        `Opp fouls committed/90: ${fmtNum(oppFoulsCommitted90)}`
      );
    if (Number.isFinite(r.opponent_factor))
      maybeContextBits.push(
        `Opponent adj: ×${fmtNum(r.opponent_factor, 3)}`
      );
    if (refFactor != null)
      maybeContextBits.push(`Ref factor: ×${fmtNum(refFactor, 3)}`);
    if (Number.isFinite(r.ref_cards_per_match))
      maybeContextBits.push(
        `Ref cards/match: ${fmtNum(r.ref_cards_per_match, 2)}`
      );

    const marketBlurb =
      {
        "shots_over_1.5":
          "We model total shots with a Poisson process using the player's shots per 90. Probability shown is P(X > 1).",
        "sot_over_0.5":
          "We estimate shots on target from an event rate scaled by projected minutes (Bernoulli→Poisson approx).",
        "fouls_over_0.5":
          "Fouls committed are modeled with a Poisson rate from fouls committed per 90; probability is at least 1 foul.",
        "fouls_drawn_over_0.5":
          "Fouls drawn are modeled from fouls drawn per 90, adjusted by opponent fouls committed and referee tendencies.",
        "to_be_booked":
          "Booking probability comes from cards per 90, adjusted by context when available.",
      }[r.market] ||
      "Probability estimated from per-minute rates scaled by projected minutes.";

    const inputs = [];
    if (r.per90_shots != null) inputs.push(`Shots/90: ${r.per90_shots}`);
    if (r.per90_sot != null) inputs.push(`SoT/90: ${r.per90_sot}`);
    if (r.per90_fouls != null) inputs.push(`Fouls/90: ${r.per90_fouls}`);
    if (r.per90_fouls_drawn != null)
      inputs.push(`Fouls drawn/90: ${r.per90_fouls_drawn}`); // 👈 NEW INPUT
    if (r.cards_per90 != null) inputs.push(`Cards/90: ${r.cards_per90}`);
    inputs.push(`Projected minutes: ${mins}m`);

    const contextLine =
      `Context → Opponent: ${opponentTeamName}` +
      (maybeContextBits.length
        ? ` • ${maybeContextBits.join(" • ")}`
        : " • Opponent/ref data: —");

    return [
      `Market: ${MARKET_LABELS[r.market] || r.market}${
        r.line != null ? ` (line ${r.line})` : ""
      }`,
      marketBlurb,
      contextLine,
      `Inputs → ${inputs.join(" • ")}`,
      p != null
        ? `Model probability: ${fmtPct(p)} → Fair odds: ${fmtOdds(fair)}`
        : "Model probability unavailable.",
      r.best_price
        ? `Best available: ${r.bookmaker} @ ${fmtOdds(r.best_price)}${
            r.edge != null ? ` (edge ${fmtEdge(r.edge)})` : ""
          }`
        : "No bookmaker price available yet.",
    ];
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.cardHeaderRow}>
          <div className={styles.cardTitleBlock}>
            <div className={styles.cardTitle}>Player Props (CSB Fair Odds)</div>
            <div className={styles.cardSubtitle}>
              Model probability, fair odds and (when available) best market price.
            </div>
          </div>

          <div className={styles.toolbar}>
            <div className={styles.filters}>
              <label className={styles.label}>
                <span>Team</span>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  disabled={locked}
                >
                  {teamOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.label}>
                <span>Market</span>
                <select
                  value={marketFilter}
                  onChange={(e) => setMarketFilter(e.target.value)}
                  disabled={locked}
                >
                  {marketOptions.map((m) => (
                    <option key={m} value={m}>
                      {m === "All" ? "All markets" : MARKET_LABELS[m] || m}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <input
              className={styles.search}
              placeholder="Search player…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={locked}
            />
          </div>
        </div>

        {/* ---------- LOCKED / BLURRED STATE ---------- */}
        {locked && (
          <div className={styles.lockedWrap}>
            {/* blurred fake table skeleton */}
            <div className={styles.blurContainer}>
              <div className={styles.blurInner}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Team</th>
                      <th>Market</th>
                      <th className={styles.num}>Min</th>
                      <th className={styles.num}>Model p</th>
                      <th className={styles.num}>Fair</th>
                      <th className={styles.num}>Best</th>
                      <th className={styles.num}>Edge</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((i) => (
                      <tr key={i} className={styles.skeletonRow}>
                        <td className={styles.player}>
                          <div className={styles.skelBar} />
                        </td>
                        <td className={styles.team}>
                          <div className={styles.skelBar} />
                        </td>
                        <td className={styles.market}>
                          <div className={styles.skelBar} />
                        </td>
                        <td className={styles.num}>
                          <div className={styles.skelBarShort} />
                        </td>
                        <td className={styles.num}>
                          <div className={styles.skelBarShort} />
                        </td>
                        <td className={styles.num}>
                          <div className={styles.skelBarShort} />
                        </td>
                        <td className={styles.num}>
                          <div className={styles.skelBarShort} />
                        </td>
                        <td className={styles.num}>
                          <div className={styles.skelBarShort} />
                        </td>
                        <td className={styles.action}></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* overlay */}
              <div className={styles.blurOverlay}>
                <PremiumUpsellBanner
                  mode="inline"
                  message="CSB player prop fair odds and edges are a Premium feature."
                />
                <button
                  className={styles.unlockBtn}
                  onClick={() => (window.location.href = "/premium")}
                >
                  🔒 Unlock CSB Player Props
                </button>
              </div>
            </div>

            {/* tiny helper text for logged-out users */}
            {!user && (
              <div className={styles.lockedHint}>
                Already a member?{" "}
                <a href="/login" style={{ color: "#9be7ff" }}>
                  Log in →
                </a>
              </div>
            )}
          </div>
        )}

        {/* ---------- PREMIUM USERS: REAL TABLE ---------- */}
        {!locked && (
          <>
            {loading ? (
              <p className={styles.loading}>Loading player props…</p>
            ) : err ? (
              <p className={styles.empty} style={{ color: "#c00" }}>
                {err}
              </p>
            ) : rows.length === 0 ? (
              <p className={styles.empty}>No props match your filters.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <colgroup>
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "6%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Team</th>
                      <th>Market</th>
                      <th className={styles.num}>Min</th>
                      <th className={styles.num}>Model p</th>
                      <th className={styles.num}>Fair</th>
                      <th className={styles.num}>Best</th>
                      <th className={styles.num}>Edge</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const isOpen = expanded === idx;
                      const edgePos = r.edge != null && r.edge > 0;
                      return (
                        <React.Fragment
                          key={`${r.player_id}-${r.market}-${idx}`}
                        >
                          <tr className={styles.row}>
                            <td className={styles.player}>
                              {r.player || "—"}
                            </td>
                            <td className={styles.team}>
                              {r.teamDisplay || "—"}
                            </td>
                            <td className={styles.market}>
                              {MARKET_LABELS[r.market] || r.market}
                              {r.line != null ? ` (${r.line})` : ""}
                            </td>
                            <td className={styles.num}>
                              {r.proj_minutes ?? "—"}
                            </td>
                            <td className={styles.num}>
                              {fmtPct(r.prob)}
                            </td>
                            <td className={styles.num}>
                              {fmtOdds(r.fair_odds)}
                            </td>
                            <td className={styles.num}>
                              {r.best_price
                                ? `${r.bookmaker} @ ${fmtOdds(
                                    r.best_price
                                  )}`
                                : "—"}
                            </td>
                            <td
                              className={`${styles.num} ${
                                edgePos ? styles.edgePos : ""
                              }`}
                            >
                              {fmtEdge(r.edge)}
                            </td>
                            <td className={styles.action}>
                              <button
                                className={styles.whyBtn}
                                onClick={() =>
                                  setExpanded(isOpen ? null : idx)
                                }
                                aria-expanded={isOpen}
                              >
                                {isOpen ? "Hide" : "Why?"}
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className={styles.explainRow}>
                              <td
                                colSpan={9}
                                className={styles.explainCell}
                              >
                                {explain(r).map((line, i) => (
                                  <div
                                    key={i}
                                    className={styles.explainLine}
                                  >
                                    • {line}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}