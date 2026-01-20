// src/pages/Fixtures.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "../styles/Fixtures.module.css";
import { api } from "../api"; // ← env-based axios client

// ---- Pretty competition names (mirrors PublicDashboard.jsx, with a couple aliases) ----
const COMP_NAMES = {
  UCL: "UEFA Champions League", UEL: "UEFA Europa League", UECL: "UEFA Europa Conference League",
  EPL: "Premier League", CHAMP: "EFL Championship", LG1: "EFL League One", LG2: "EFL League Two",
  ENG_FA: "FA Cup", ENG_EFL: "EFL Cup", NAT_LEAGUE: "National League", NAT_NORTH: "National League North", NAT_SOUTH: "National League South",
  SCO_PREM: "Scottish Premiership", SCO_CHAMP: "Scottish Championship", SCO_1: "Scottish League One",
  SCO_2: "Scottish League Two", SCO_SC: "Scottish Cup", SCO_LC: "Scottish League Cup", SCO_CHAL: "Scottish Challenge Cup",
  LIGUE1: "Ligue 1", LIGUE2: "Ligue 2", FRA_CDF: "Coupe de France",
  BUNDES: "Bundesliga", BUNDES2: "2. Bundesliga", GER_POKAL: "DFB-Pokal",
  LA_LIGA: "La Liga", LA_LIGA2: "La Liga 2",
  SERIE_A: "Serie A", SERIE_B: "Serie B", ITA_COPPA: "Coppa Italia",
  POR_LIGA: "Primeira Liga", POR_TACA: "Taça de Portugal",
  DEN_SL: "Danish Superliga", DEN_CUP: "Danish Cup",
  NED_ERED: "Eredivisie", NED_EERST: "Eerste Divisie", NED_KNVB: "KNVB Cup",
  BEL_PRO: "Belgian Pro League", BEL_CUP: "Belgian Cup",
  NOR_ELI: "Eliteserien", NOR_CUP: "Norwegian Cup",
  SWE_ALLSV: "Allsvenskan", SWE_ALLS: "Allsvenskan", SWE_SUPER: "Superettan", SWE_CUP: "Swedish Cup",
  BR_SERIE_A: "Brazil Serie A", BR_SERIE_B: "Brazil Serie B",
  ARG_LP: "Argentina Primera División",
  MLS: "Major League Soccer",
  NFL: "NFL (American Football)", NBA: "NBA (Basketball)", NHL: "NHL (Hockey)",
  NCAA: "College Football", CFB: "College Football",
  WCQ_EUR: "World Cup Qualifiers (Europe)",
  DEFAULT: "Football",
};
const prettyComp = (code) => COMP_NAMES[code] || code || "—";

const Fixtures = () => {
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- Helper: format kickoff in user timezone ----
  const formatKickoff = (utcString, withDate = false) => {
    if (!utcString) return "";
    const kickoff = utcString.endsWith("Z") ? utcString : utcString + "Z"; // ensure UTC
    return new Date(kickoff).toLocaleString(navigator.language, {
      weekday: withDate ? "short" : undefined,
      day: withDate ? "numeric" : undefined,
      month: withDate ? "short" : undefined,
      hour: "2-digit",
      minute: "2-digit",
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const { data } = await api.get("/api/fixtures/all");
        setFixtures(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching fixtures:", err);
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFixtures();
  }, []);

  if (loading) return <p className={styles.loading}>Loading fixtures...</p>;
  if (!fixtures.length) return <p className={styles.empty}>No fixtures available.</p>;

  // Group fixtures by pretty competition + date
  const grouped = fixtures.reduce((acc, f) => {
    const date = formatKickoff(f.kickoff_utc, true); // includes weekday + date
    const key = `${prettyComp(f.comp)} • ${date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <div className={styles.page}>
      <h2 className={styles.title}>All Fixtures</h2>
      {Object.keys(grouped).map((group) => (
        <div key={group} className={styles.group}>
          <h3 className={styles.groupTitle}>{group}</h3>
          <div className={styles.cards}>
            {grouped[group].map((f) => (
              <Link key={f.id} to={`/fixture/${f.id}`} className={styles.card}>
                <div className={styles.teams}>
                  {f.home_team} <span className={styles.vs}>vs</span> {f.away_team}
                </div>
                <div className={styles.kickoff}>{formatKickoff(f.kickoff_utc)}</div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Fixtures;