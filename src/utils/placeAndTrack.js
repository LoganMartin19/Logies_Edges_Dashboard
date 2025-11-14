// src/utils/placeAndTrack.js
import { api } from "../api";
import { getBookmakerUrl } from "../bookmakers";

/**
 * 1) Creates a UserBet row for the logged-in user
 * 2) Opens the bookmaker site in a new tab
 */
export async function placeAndTrackEdge(edge, opts = {}) {
  const {
    stake = 1,
    sourceTipsterId = null,   // if this came from a tipster pick
    openBookmaker = true,
  } = opts;

  if (!edge) throw new Error("No edge supplied");

  const payload = {
    fixture_id: edge.fixture_id,
    market: edge.market,
    bookmaker: edge.bookmaker,
    price: Number(edge.price),
    stake: Number(stake),
    source_tipster_id: sourceTipsterId,
  };

  // hits POST /user-bets.json (per-user bet log)
  const res = await api.post("/user-bets.json", payload);
  const bet = res.data;

  if (openBookmaker) {
    const url = getBookmakerUrl(edge.bookmaker);
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  return bet;
}