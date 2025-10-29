// src/utils/marketLabel.ts
export function marketLabel(mkt?: string): string {
    const m = (mkt || "").toUpperCase().trim();
  
    // 1X2
    if (m === "HOME_WIN" || m === "1") return "Home win";
    if (m === "AWAY_WIN" || m === "2") return "Away win";
    if (m === "DRAW"     || m === "X") return "Draw";
  
    // Double Chance
    if (m === "DC_1X" || m === "1X") return "1X (Home or Draw)";
    if (m === "DC_12" || m === "12") return "12 (Either team)";
    if (m === "DC_X2" || m === "X2") return "X2 (Away or Draw)";
  
    // Draw No Bet
    if (m === "DNB_HOME") return "Draw No Bet (Home)";
    if (m === "DNB_AWAY") return "Draw No Bet (Away)";
  
    // BTTS
    if (m === "BTTS_Y") return "BTTS: Yes";
    if (m === "BTTS_N") return "BTTS: No";
  
    // Totals: O2.5 / U2.5 / O3.0 etc
    const ou = m.match(/^([OU])(\d+(\.\d+)?)$/);
    if (ou) {
      const side = ou[1] === "O" ? "Over" : "Under";
      return `${side} ${ou[2]}`;
    }
  
    // Fallback: title case + tidy underscores
    return m.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, s => s.toUpperCase());
  }
  
  export function bookmakerDisplay(bk?: string): string | null {
    if (!bk) return null;
    const clean = bk.trim();
    if (clean.toLowerCase() === "manual") return null; // hide "manual"
    return clean;
  }
  
  export function priceDisplay(p?: number | null): string {
    if (p == null) return "";
    return `@${Number(p).toFixed(p >= 10 ? 1 : 2)}`;
  }