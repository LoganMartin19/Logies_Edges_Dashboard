// src/api.js
import axios from "axios";
import { auth } from "./firebase"; // <-- to read current user token

export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://logies-edges-api.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// -----------------------------
// Attach Firebase ID token
// -----------------------------
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

// -----------------------------
// Handle 401 gracefully (NO redirect for public pages)
// -----------------------------
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // Many routes are public; just bubble up the error
      return Promise.reject(err);
    }
    return Promise.reject(err);
  }
);

// -----------------------------
// Auth: /auth/me
// -----------------------------
export const fetchCurrentUser = () =>
  api.get("/auth/me").then((r) => r.data);

// -----------------------------
// Public helpers
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

// Get logged-in user's own tipster profile
export const fetchMyTipster = async () => {
  const res = await api.get("/api/tipsters/me");
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

export const deleteTipsterAcca = (accaId) =>
  api.delete(`/api/tipsters/accas/${accaId}`).then((r) => r.data);

// ----- Tipsters follow/unfollow -----
export const followTipster = async (username) => {
  const res = await api.post(
    `/api/tipsters/${encodeURIComponent(username)}/follow`
  );
  return res.data;
};

export const unfollowTipster = async (username) => {
  const res = await api.delete(
    `/api/tipsters/${encodeURIComponent(username)}/follow`
  );
  return res.data;
};

// ----- Following feed -----
export const fetchFollowingList = async () =>
  api.get("/api/tipsters/following/list").then((r) => r.data);

export const fetchFollowingFeed = async () =>
  api.get("/api/tipsters/following/feed").then((r) => r.data);

// -----------------------------
// Billing (Stripe)
// -----------------------------

// Start Stripe Checkout for premium
export const startPremiumCheckout = async () => {
  const res = await api.post("/api/billing/create-checkout-session");
  return res.data; // { checkout_url }
};

// Stripe customer billing portal (manage subscription)
export const fetchBillingPortal = async () => {
  const res = await api.post("/api/billing/customer-portal");
  return res.data; // { url }
};

// Check current billing / premium status from backend
export const fetchBillingStatus = async () => {
  const res = await api.get("/api/billing/status");
  return res.data; // e.g. { is_premium, stripe_customer_id, ... }
};