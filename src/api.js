import axios from "axios";

const API_BASE = "http://127.0.0.1:8000"; // point to your FastAPI

export async function fetchShortlist() {
  const res = await axios.get(`${API_BASE}/shortlist`); 
  return res.data;
}