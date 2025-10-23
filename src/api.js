// src/api.js
import axios from "axios";

// CRA envs:
export const API_BASE =
  process.env.REACT_APP_API_BASE || "https://logies-edges-api.onrender.com";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Helpers
export const fetchShortlist = () =>
  api.get("/shortlist").then(r => r.data);

export const fetchDailyFixtures = (day, sport = "all") =>
  api.get("/api/public/fixtures/daily", { params: { day, sport } }).then(r => r.data);