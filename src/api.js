import axios from "axios";

// Use env var if available (set in Vercel), else fallback to localhost for dev
const API_BASE =
  process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";

export async function fetchShortlist() {
  const res = await axios.get(`${API_BASE}/shortlist`);
  return res.data;
}

// (optional: small helper for reuse)
export const api = axios.create({
  baseURL: API_BASE,
});