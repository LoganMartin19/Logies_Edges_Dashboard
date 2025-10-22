// src/pages/BetTrackerPage.jsx
import React from "react";
import BetTracker from "../components/BetTracker";

export default function BetTrackerPage() {
  return (
    <div>
      <h1>💰 My Bets</h1>
      <p style={{ opacity: 0.7, marginBottom: 12 }}>
        View and track all your bets. Edit stake, settle results, or delete old ones.
      </p>
      <BetTracker />
    </div>
  );
}