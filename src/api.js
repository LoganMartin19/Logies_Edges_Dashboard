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
// Tipsters Platform v0
// -----------------------------

// List Tipsters (for /Tipsters page). Supports optional sort & sport filter.
export const fetchTipsters = ({ sort = "roi_30d_desc", sport } = {}) =>
  api
    .get("/api/tipsters", { params: { sort, sport } })
    .then(r => r.data);

// Read one tipster profile by username
export const fetchTipster = (username) =>
  api.get(`/api/tipsters/${encodeURIComponent(username)}`).then(r => r.data);

// Recent picks for a tipster (optional params: limit, since, settled)
export const fetchTipsterPicks = (username, { limit = 50, settled } = {}) =>
  api
    .get(`/api/tipsters/${encodeURIComponent(username)}/picks`, {
      params: { limit, settled },
    })
    .then(r => r.data);

// (Optional for later) Create a pick — keep here for admin/internal UI
export const createTipsterPick = (username, payload) =>
  api
    .post(`/api/tipsters/${encodeURIComponent(username)}/picks`, payload)
    .then(r => r.data);

// (Optional) Leaderboard snapshot (if you add a dedicated endpoint)
export const fetchTipsterLeaderboard = ({ window = "30d", sport } = {}) =>
  api
    .get("/api/tipsters/leaderboard", { params: { window, sport } })
    .then(r => r.data);

  // Create a new tipster (used on Tipster Sign Up page)
export const tipstersCreate = (payload) =>
  api.post("/api/tipsters", payload).then((r) => r.data);