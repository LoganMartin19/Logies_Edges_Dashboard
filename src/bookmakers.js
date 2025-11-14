// src/utils/bookmakers.js
export function getBookmakerUrl(rawName) {
    if (!rawName) return null;
  
    // normalise: lowercase, no spaces, no punctuation
    const key = String(rawName)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9]/g, "");
  
    const MAP = {
      // UK majors
      bet365: "https://www.bet365.com/#/AC/B1/",
      skybet: "https://m.skybet.com",
      skysports: "https://m.skybet.com",
      paddypower: "https://www.paddypower.com/sport",
      paddy: "https://www.paddypower.com/sport",
      ladbrokes: "https://www.ladbrokes.com/sports",
      coral: "https://sports.coral.co.uk",
      williamhill: "https://sports.williamhill.com/betting/en-gb",
      hills: "https://sports.williamhill.com/betting/en-gb",
      unibet: "https://www.unibet.co.uk/sports",
      betfair: "https://www.betfair.com/sport",
      betvictor: "https://www.betvictor.com/en-gb/sports",
      boylesports: "https://www.boylesports.com/sport",
      betfred: "https://www.betfred.com/sport",
  
      // fallback generic keys if your odds feed uses these
      genericuk: "https://www.oddschecker.com/football",
    };
  
    return MAP[key] || null;
  }