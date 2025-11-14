// src/utils/placeAndTrack.js
import { api } from "../api";
import { getBookmakerUrl } from "../bookmakers";

export async function placeAndTrackEdge(edge, options = {}) {
  const { stake = 1, openBookmaker = false, sourceTipsterId = null } = options;

  const payload = {
    fixture_id: Number(edge.fixture_id) || null,
    market: edge.market,
    bookmaker: edge.bookmaker || null,
    price: Number(edge.price),
    stake: Number(stake),
    source_tipster_id: sourceTipsterId,
  };

  // 🔗 Open bookmaker first, as part of the click event
  if (openBookmaker) {
    const bmUrl = getBookmakerUrl(edge.bookmaker);
    console.log("placeAndTrackEdge bookmaker:", edge.bookmaker, "→", bmUrl);

    if (bmUrl) {
      window.open(bmUrl, "_blank", "noopener");
    } else {
      // optional: tell us in console when there’s no mapping
      console.warn("No URL mapping for bookmaker:", edge.bookmaker);
    }
  }

  // 📝 Then log the bet to the backend (user_bets)
  // (Firebase auth header is attached in api.js)
  const { data } = await api.post("/api/user-bets", payload);
  return data;
}