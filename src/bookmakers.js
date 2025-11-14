// src/bookmakers.js
export const BOOKMAKER_URLS = {
    bet365: "https://www.bet365.com/",
    unibet: "https://www.unibet.co.uk/",
    skybet: "https://m.skybet.com/",
    paddy: "https://www.paddypower.com/",
    ladbrokes: "https://www.ladbrokes.com/",
    williamhill: "https://sports.williamhill.com/betting/en-gb",
    // add / tweak as you like
  };
  
  export function getBookmakerUrl(name) {
    if (!name) return null;
    const key = String(name).toLowerCase().replace(/\s+/g, "");
    return BOOKMAKER_URLS[key] || null;
  }