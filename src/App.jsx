// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import AuthGate from "./components/AuthGate";
import RequireAdmin from "./components/RequireAdmin";
import NavBar from "./components/NavBar";

import Dashboard from "./pages/Dashboard";
import FixturePage from "./pages/FixturePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import Fixtures from "./pages/Fixtures";
import BetTrackerPage from "./pages/BetTrackerPage";
import PlayerPage from "./pages/PlayerPage";
import FootballGames from "./pages/FootballGames";
import NflGames from "./pages/NFLGames";
import CfbGames from "./pages/CfbGames";
import CfbFixturePage from "./pages/CfbFixturePage";
import NhlGames from "./pages/NhlGames";
import NhlGameDetail from "./pages/NhlGameDetail";
import Tennis from "./pages/Tennis";
import TennisMatch from "./pages/TennisMatch";
import Basketball from "./pages/Basketball";
import BasketballFixture from "./pages/BasketballFixture";

import PublicDashboard from "./pages/PublicDashboard";
import Performance from "./pages/Performance";

import TipstersPage from "./pages/TipstersPage";
import TipsterDetailPage from "./pages/TipsterDetailPage";
import TipsterApply from "./pages/TipsterApply";
import TipsterAddPick from "./pages/TipsterAddPick";
import TipsterAddAcca from "./pages/TipsterAddAcca";
import TipsterEdit from "./pages/TipsterEdit";

import AdminPicks from "./pages/AdminPicks";
import AdminPage from "./pages/AdminPage";

import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import AccountPage from "./pages/AccountPage";
import FollowingFeedPage from "./pages/FollowingFeedPage";
import PremiumPage from "./pages/PremiumPage";

function App() {
  return (
    <AuthGate>
      <Router>
        {/* NavBar always visible */}
        <NavBar />

        <main style={{ padding: "20px" }}>
          <Routes>
            {/* 🔐 Admin-only protected routes */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/picks"
              element={
                <RequireAdmin>
                  <AdminPicks />
                </RequireAdmin>
              }
            />

            {/* Public dashboard */}
            <Route path="/" element={<PublicDashboard />} />

            {/* Fixture + sports pages */}
            <Route path="/fixture/:id" element={<FixturePage />} />
            <Route path="/fixtures" element={<Fixtures />} />
            <Route path="/bets" element={<BetTrackerPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/football" element={<FootballGames />} />
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/nfl" element={<NflGames />} />
            <Route path="/cfb" element={<CfbGames />} />
            <Route path="/cfb/fixture/:id" element={<CfbFixturePage />} />
            <Route path="/nhl" element={<NhlGames />} />
            <Route path="/nhl/game/:id" element={<NhlGameDetail />} />
            <Route path="/tennis" element={<Tennis />} />
            <Route path="/tennis/match/:id" element={<TennisMatch />} />
            <Route path="/basketball" element={<Basketball />} />
            <Route path="/basketball/game/:id" element={<BasketballFixture />} />
            <Route path="/performance" element={<Performance />} />

            {/* Tipsters platform */}
            <Route path="/tipsters" element={<TipstersPage />} />
            <Route path="/tipsters/become" element={<TipsterApply />} />
            <Route path="/tipsters/:username" element={<TipsterDetailPage />} />
            <Route path="/tipsters/:username/new-pick" element={<TipsterAddPick />} />
            <Route path="/tipsters/:username/new-acca" element={<TipsterAddAcca />} />
            <Route path="/tipsters/:username/edit" element={<TipsterEdit />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Account / social / premium */}
            <Route path="/account" element={<AccountPage />} />
            <Route path="/following" element={<FollowingFeedPage />} />
            <Route path="/premium" element={<PremiumPage />} />

            {/* Legacy dashboard if you still want it available */}
            <Route path="/legacy-admin" element={<Dashboard />} />
          </Routes>
        </main>
      </Router>
    </AuthGate>
  );
}

export default App;