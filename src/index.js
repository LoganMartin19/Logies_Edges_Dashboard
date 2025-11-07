// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
//import "./styles/global.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { Analytics } from "@vercel/analytics/react";
import AuthGate from "./components/AuthGate"; // ✅ wrap provider

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthGate>
      <App />
      <Analytics />
    </AuthGate>
  </React.StrictMode>
);

reportWebVitals();