// src/api.js
import axios from "axios";
import { auth } from "./firebase"; // <-- to read current user token

export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://logies-edges-api.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// 👇 keep this – handy for debugging in the browser
if (typeof window !== "undefined") {
  window.api = api;
}

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

// 👇 NEW: trigger welcome-email test for the logged-in user
export const sendTestWelcomeEmail = () =>
  api.post("/auth/welcome-email/test").then((r) => r.data);

// -----------------------------
// Admin: Featured Picks Email
// -----------------------------
export const sendFeaturedPicksEmail = async ({ day, premiumOnly = false }) => {
  // day: "2025-11-30" (defaults to today if omitted server-side)
  const res = await api.post(
    "/admin/email/featured-picks",
    null, // no body
    {
      params: {
        day,
        premium_only: premiumOnly,
      },
    }
  );
  return res.data;
};
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
  const res = await api.post("/api/billing/premium/checkout");
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

// -----------------------------
// Tipster Subscriptions (OnlyFans-style)
// -----------------------------

// Get viewer's subscription state for a tipster
export const fetchTipsterSubscription = async (username) => {
  const res = await api.get(
    `/api/tipsters/${encodeURIComponent(username)}/subscription`
  );
  return res.data;
};

// Start subscription (manual for now — will swap to Stripe Checkout)
export async function startTipsterSubscription(username) {
  const res = await api.post(
    `/api/tipsters/${encodeURIComponent(username)}/subscription/checkout`
  );
  return res.data;
}

// Cancel subscription
export const cancelTipsterSubscription = async (username) => {
  const res = await api.post(
    `/api/tipsters/${encodeURIComponent(username)}/subscription/cancel`
  );
  return res.data;
};

// ----- Tipster Stripe Connect (creator payouts) -----
export const fetchTipsterConnectStatus = (username) =>
  api
    .get(
      `/api/tipsters/${encodeURIComponent(username)}/connect/status`
    )
    .then((r) => r.data);

export const startTipsterConnectOnboarding = (username) =>
  api
    .post(
      `/api/tipsters/${encodeURIComponent(username)}/connect/onboard`
    )
    .then((r) => r.data); // { onboarding_url }

export const fetchTipsterConnectDashboard = (username) =>
  api
    .get(
      `/api/tipsters/${encodeURIComponent(username)}/connect/dashboard`
    )
    .then((r) => r.data); // { dashboard_url }

// -----------------------------
// Web Push / Notifications
// -----------------------------
export async function registerPushToken(token, platform = "web") {
  const res = await api.post("/api/push/register", { token, platform });
  return res.data;
}