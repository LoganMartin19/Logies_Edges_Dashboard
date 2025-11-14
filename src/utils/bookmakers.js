// src/utils/bookmakers.js
export function getBookmakerUrl(rawName) {
  if (!rawName) return null;

  const raw = String(rawName).toLowerCase().trim();
  const key = raw.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");

  // ⭐ HOMEPAGE-ONLY URL MAP
  const MAP = {
    bet365: "https://www.bet365.com/",
    skybet: "https://m.skybet.com",
    paddypower: "https://www.paddypower.com/",
    ladbrokes: "https://www.ladbrokes.com/",
    coral: "https://www.coral.co.uk/",
    williamhill: "https://sports.williamhill.com/",
    hills: "https://sports.williamhill.com/",
    unibet: "https://www.unibet.co.uk/",
    betfair: "https://www.betfair.com/",
    betvictor: "https://www.betvictor.com/",
    boylesports: "https://www.boylesports.com/",
    betfred: "https://www.betfred.com/",
  };

  // Direct key match
  if (MAP[key]) return MAP[key];

  // ⭐ Fuzzy fallbacks
  if (raw.includes("unibet")) return MAP.unibet;
  if (raw.includes("william") || raw.includes("hill")) return MAP.williamhill;
  if (raw.includes("bet365")) return MAP.bet365;
  if (raw.includes("paddy")) return MAP.paddypower;
  if (raw.includes("sky")) return MAP.skybet;
  if (raw.includes("ladbrokes")) return MAP.ladbrokes;
  if (raw.includes("coral")) return MAP.coral;
  if (raw.includes("betfair")) return MAP.betfair;
  if (raw.includes("victor")) return MAP.betvictor;
  if (raw.includes("boyle")) return MAP.boylesports;
  if (raw.includes("fred")) return MAP.betfred;

  return null;
}