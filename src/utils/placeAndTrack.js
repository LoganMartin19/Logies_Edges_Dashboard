// src/utils/placeAndTrack.js
import { api } from "../api";

export async function placeAndTrackEdge(edge, options = {}) {
  const { stake = 1, sourceTipsterId = null } = options;

  const payload = {
    fixture_id: Number(edge.fixture_id) || null,
    market: edge.market,
    bookmaker: edge.bookmaker || null,
    price: Number(edge.price),
    stake: Number(stake),
    source_tipster_id: sourceTipsterId,
  };

  // 🔥 JUST log the bet. No window.open here any more.
  const { data } = await api.post("/api/user-bets", payload);
  return data;
}