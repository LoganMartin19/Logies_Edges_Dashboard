// src/utils/bookmakers.js
export function getBookmakerUrl(rawName) {
    if (!rawName) return null;
  
    const raw = String(rawName).toLowerCase().trim();
    const key = raw.replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  
    // Direct exact keys
    const MAP = {
      bet365: "https://www.bet365.com/#/AC/B1/",
      skybet: "https://m.skybet.com",
      paddypower: "https://www.paddypower.com/sport",
      ladbrokes: "https://www.ladbrokes.com/sports",
      coral: "https://sports.coral.co.uk",
      williamhill: "https://sports.williamhill.com/betting/en-gb",
      hills: "https://sports.williamhill.com/betting/en-gb",
      unibet: "https://www.unibet.co.uk/sports",
      betfair: "https://www.betfair.com/sport",
      betvictor: "https://www.betvictor.com/en-gb/sports",
      boylesports: "https://www.boylesports.com/sport",
      betfred: "https://www.betfred.com/sport",
    };
  
    if (MAP[key]) return MAP[key];
  
    // Fuzzy fallbacks – covers things like "Unibet (Sportsbook)", "William Hill – UK"
    if (raw.includes("unibet")) return MAP.unibet;
    if (raw.includes("william")) return MAP.williamhill;
    if (raw.includes("hill")) return MAP.williamhill;
    if (raw.includes("bet365")) return MAP.bet365;
    if (raw.includes("paddy")) return MAP.paddypower;
    if (raw.includes("skybet") || raw.includes("sky bet")) return MAP.skybet;
    if (raw.includes("ladbrokes")) return MAP.ladbrokes;
    if (raw.includes("coral")) return MAP.coral;
    if (raw.includes("betfair")) return MAP.betfair;
    if (raw.includes("betvictor")) return MAP.betvictor;
    if (raw.includes("boyles")) return MAP.boylesports;
    if (raw.includes("betfred")) return MAP.betfred;
  
    return null;
  }