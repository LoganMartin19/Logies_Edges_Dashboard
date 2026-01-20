// src/pages/BetTrackerPage.jsx
import React from "react";
import BetTracker from "../components/BetTracker";
import { useAuth } from "../components/AuthGate";
import PremiumUpsellBanner from "../components/PremiumUpsellBanner";
import SiteFooterDisclaimer from "../components/SiteFooterDisclaimer";
import StakingGuide from "../components/StakingGuide"; // ⭐ NEW

export default function BetTrackerPage() {
  const { isPremium } = useAuth();

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>💰 My Bets</h1>
      <p style={{ opacity: 0.7, marginBottom: 12 }}>
        View and track all your bets. Edit stake, settle results, or delete old ones.
      </p>

      {!isPremium && (
        <PremiumUpsellBanner
          mode="link"
          message="Upgrade to CSB Premium to unlock deeper stats, long-term charts and extra model edges on your tracked bets."
        />
      )}

      {/* 📚 Staking / Kelly guide */}
      <StakingGuide />

      <BetTracker />
      <SiteFooterDisclaimer variant="short" />
    </div>
  );
}