// src/api.js
import axios from "axios";

// CRA envs:
export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://logies-edges-api.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// -----------------------------
// Public site helpers (existing)
// -----------------------------
export const fetchShortlist = () =>
  api.get("/shortlist").then(r => r.data);

export const fetchDailyFixtures = (day, sport = "all") =>
  api.get("/api/public/fixtures/daily", { params: { day, sport } }).then(r => r.data);

// -----------------------------
// Creators Platform v0
// -----------------------------

// List creators (for /creators page). Supports optional sort & sport filter.
export const fetchCreators = ({ sort = "roi_30d_desc", sport } = {}) =>
  api
    .get("/api/creators", { params: { sort, sport } })
    .then(r => r.data);

// Read one creator profile by username
export const fetchCreator = (username) =>
  api.get(`/api/creators/${encodeURIComponent(username)}`).then(r => r.data);

// Recent picks for a creator (optional params: limit, since, settled)
export const fetchCreatorPicks = (username, { limit = 50, settled } = {}) =>
  api
    .get(`/api/creators/${encodeURIComponent(username)}/picks`, {
      params: { limit, settled },
    })
    .then(r => r.data);

// (Optional for later) Create a pick — keep here for admin/internal UI
export const createCreatorPick = (username, payload) =>
  api
    .post(`/api/creators/${encodeURIComponent(username)}/picks`, payload)
    .then(r => r.data);

// (Optional) Leaderboard snapshot (if you add a dedicated endpoint)
export const fetchCreatorLeaderboard = ({ window = "30d", sport } = {}) =>
  api
    .get("/api/creators/leaderboard", { params: { window, sport } })
    .then(r => r.data);