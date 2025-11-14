// src/api.js
import axios from "axios";
import { auth } from "./firebase"; // <-- to read current user token

export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://logies-edges-api.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// --- Attach Firebase ID token if logged in ---
api.interceptors.request.use(async (config) => {
  const u = auth?.currentUser;
  if (u) {
    try {
      const token = await u.getIdToken();
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // ignore token errors
    }
  }
  return config;
});

// --- Optional: handle expired/invalid tokens globally ---
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// -----------------------------
// Public site helpers
// -----------------------------
export const fetchShortlist = () =>
  api.get("/shortlist").then((r) => r.data);

export const fetchDailyFixtures = (day, sport = "all") =>
  api
    .get("/api/public/fixtures/daily", { params: { day, sport } })
    .then((r) => r.data);

// -----------------------------
// Tipsters Platform
// -----------------------------

export const fetchTipsters = ({ sort = "roi_30d_desc", sport } = {}) =>
  api.get("/api/tipsters", { params: { sort, sport } }).then((r) => r.data);

// ✅ Helper: find the current user’s tipster by scanning the list
// ✅ Get the current user’s tipster profile directly
export const fetchMyTipster = async () => {
  const res = await api.get("/api/tipsters/me");
  // when not a tipster yet, backend returns null
  return res.data || null;
};

export const fetchTipster = (username) =>
  api
    .get(`/api/tipsters/${encodeURIComponent(username)}`)
    .then((r) => r.data);

export const fetchTipsterPicks = (username, { limit = 50, settled } = {}) =>
  api
    .get(`/api/tipsters/${encodeURIComponent(username)}/picks`, {
      params: { limit, settled },
    })
    .then((r) => r.data);

export const tipstersCreate = (payload) =>
  api.post("/api/tipsters", payload).then((r) => r.data);

// ----- Picks -----
export const createTipsterPick = (username, payload) =>
  api
    .post(`/api/tipsters/${encodeURIComponent(username)}/picks`, payload)
    .then((r) => r.data);

export const settleTipsterPick = (pickId, result) =>
  api
    .post(`/api/tipsters/picks/${pickId}/settle`, { result })
    .then((r) => r.data);

// delete a pick (only before kickoff / if not settled)
export const deleteTipsterPick = (pickId) =>
  api.delete(`/api/tipsters/picks/${pickId}`).then((r) => r.data);

// ----- Fixtures (single) -----
export const fetchFixture = (id) =>
  api.get(`/api/fixtures/${id}`).then((r) => r.data);

// ----- Tipster ACCAs -----
export const createTipsterAcca = (username, payload) =>
  api
    .post(`/api/tipsters/${encodeURIComponent(username)}/accas`, payload)
    .then((r) => r.data);

export const fetchTipsterAccas = (username) =>
  api
    .get(`/api/tipsters/${encodeURIComponent(username)}/accas`)
    .then((r) => r.data);

export const settleTipsterAcca = (accaId, result) =>
  api
    .post(`/api/tipsters/accas/${accaId}/settle`, { result })
    .then((r) => r.data);

// delete an acca (only before earliest leg kicks off / if not settled)
export const deleteTipsterAcca = (accaId) =>
  api.delete(`/api/tipsters/accas/${accaId}`).then((r) => r.data);

// --- Tipsters follow/unfollow ---

export const followTipster = async (username) => {
  const res = await api.post(
    `/api/tipsters/${encodeURIComponent(username)}/follow`
  );
  return res.data; // { ok, status, follower_count }
};

export const unfollowTipster = async (username) => {
  const res = await api.delete(
    `/api/tipsters/${encodeURIComponent(username)}/follow`
  );
  return res.data; // { ok, status, follower_count }
};

// --- Following Feed ---
export const fetchFollowingList = async () =>
  api.get("/api/tipsters/following/list").then((r) => r.data);

export const fetchFollowingFeed = async () => {
  const res = await api.get("/api/tipsters/following-feed");
  return res.data; // [] when not following anyone / no picks
};