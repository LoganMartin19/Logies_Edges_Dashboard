// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import FixturePage from "./pages/FixturePage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import Fixtures from "./pages/Fixtures";
import BetTrackerPage from "./pages/BetTrackerPage"; // ✅ NEW
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
import AdminPicks from "./pages/AdminPicks";
import PublicDashboard from "./pages/PublicDashboard";
import Performance from "./pages/Performance";
import TipstersPage from "./pages/TipstersPage";
import TipsterDetailPage from "./pages/TipsterDetailPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import TipsterApply from "./pages/TipsterApply";
import TipsterAddPick from "./pages/TipsterAddPick";

import NavBar from "./components/NavBar";

function App() {
  return (
    <Router>
      {/* ✅ NavBar always visible */}
      <NavBar />

      <main style={{ padding: "20px" }}>
        <Routes>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/fixture/:id" element={<FixturePage />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/bets" element={<BetTrackerPage />} /> {/* ✅ NEW ROUTE */}
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
          <Route path="/admin/picks" element={<AdminPicks />} />
          <Route path="/" element={<PublicDashboard />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/tipsters" element={<TipstersPage />} />
          <Route path="/tipsters/:username" element={<TipsterDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/tipsters/become" element={<TipsterApply />} />
          <Route path="/tipsters/:username/new-pick" element={<TipsterAddPick />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;