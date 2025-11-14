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

  let bmWindow = null;
  let bmUrl = null;

  if (openBookmaker) {
    bmUrl = getBookmakerUrl(edge.bookmaker);
    if (bmUrl) {
      // open immediately so browser treats it as user-initiated
      bmWindow = window.open("about:blank", "_blank", "noopener");
    }
  }

  // create the user_bets row (Firebase token is attached via api.js)
  const { data } = await api.post("/api/user-bets", payload);

  // now navigate the pre-opened tab
  if (bmWindow && bmUrl) {
    bmWindow.location.href = bmUrl;
  } else if (bmUrl) {
    // fallback if window didn't open for some reason
    window.open(bmUrl, "_blank", "noopener");
  }

  return data;
}