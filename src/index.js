// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/global.css";
import "./styles/preferences.module.css"; // 👈 NEW – styles for favourites modal

import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { Analytics } from "@vercel/analytics/react";
import AuthGate from "./components/AuthGate";

import { auth } from "./firebase";
// 👇 NEW: Preferences provider
import { PreferencesProvider } from "./context/PreferencesContext";

// Expose auth for debugging
if (typeof window !== "undefined") {
  window.auth = auth;
}

// Register Firebase messaging service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((reg) => {
      console.log("FCM Service Worker registered", reg.scope);
    })
    .catch((err) => {
      console.error("FCM Service Worker registration failed:", err);
    });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthGate>
      {/* 👇 Preferences available everywhere inside the app */}
      <PreferencesProvider>
        <App />
        <Analytics />
      </PreferencesProvider>
    </AuthGate>
  </React.StrictMode>
);

reportWebVitals();