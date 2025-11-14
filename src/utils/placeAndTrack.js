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

  // 🔐 Uses axios instance so Firebase token is attached
  const { data } = await api.post("/api/user-bets", payload);

  if (openBookmaker) {
    const url = getBookmakerUrl(edge.bookmaker);
    if (url) {
      window.open(url, "_blank", "noopener");
    }
  }

  return data; // UserBetOut from backend
}