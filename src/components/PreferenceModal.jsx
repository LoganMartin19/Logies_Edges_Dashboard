// src/components/PreferencesModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { usePreferences } from "../context/PreferencesContext";

// 👇 NEW: top-level sports
const POPULAR_SPORTS = [
  { code: "football", label: "Football (Soccer)" },
  { code: "basketball", label: "Basketball" },
  { code: "nfl", label: "NFL" },
  { code: "cfb", label: "College Football" },
];

const POPULAR_LEAGUES = [
  { code: "EPL", label: "Premier League" },
  { code: "SCO_PRM", label: "Scottish Premiership" },
  { code: "UCL", label: "Champions League" },
  { code: "LA_LIGA", label: "La Liga" },
  { code: "SERIE_A", label: "Serie A" },
];

const POPULAR_TEAMS = [
  "Celtic",
  "Rangers",
  "Liverpool",
  "Manchester City",
  "Arsenal",
  "Manchester United",
  "Real Madrid",
  "Barcelona",
];

export default function PreferencesModal({ open, onClose }) {
  const {
    favoriteSports,
    favoriteTeams,
    favoriteLeagues,
    updatePreferences,
    saving,
  } = usePreferences();

  const [localSports, setLocalSports] = useState(favoriteSports);
  const [localTeams, setLocalTeams] = useState(favoriteTeams);
  const [localLeagues, setLocalLeagues] = useState(favoriteLeagues);
  const [teamSearch, setTeamSearch] = useState("");

  // Sync when modal opens
  useEffect(() => {
    if (open) {
      setLocalSports(favoriteSports);
      setLocalTeams(favoriteTeams);
      setLocalLeagues(favoriteLeagues);
      setTeamSearch("");
    }
  }, [open, favoriteSports, favoriteTeams, favoriteLeagues]);

  const toggleSport = (code) => {
    setLocalSports((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleLeague = (code) => {
    setLocalLeagues((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const toggleTeam = (name) => {
    setLocalTeams((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  const filteredTeams = useMemo(() => {
    if (!teamSearch.trim()) return POPULAR_TEAMS;
    const q = teamSearch.toLowerCase();
    return POPULAR_TEAMS.filter((t) => t.toLowerCase().includes(q));
  }, [teamSearch]);

  const handleSave = async () => {
    await updatePreferences({
      favoriteSports: localSports,
      favoriteTeams: localTeams,
      favoriteLeagues: localLeagues,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="prefs-backdrop">
      <div className="prefs-modal">
        <div className="prefs-header">
          <h3>Your favourites</h3>
          <button className="prefs-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="prefs-subtitle">
          Set your favourite sports, leagues and teams. We’ll float them to the
          top of your dashboard and fixtures.
        </p>

        {/* SPORTS */}
        <section className="prefs-section">
          <h4>Sports</h4>
          <div className="prefs-chip-grid">
            {POPULAR_SPORTS.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => toggleSport(s.code)}
                className={
                  localSports.includes(s.code)
                    ? "prefs-chip prefs-chip-active"
                    : "prefs-chip"
                }
              >
                {s.label}
              </button>
            ))}
          </div>
        </section>

        {/* LEAGUES */}
        <section className="prefs-section">
          <h4>Leagues</h4>
          <div className="prefs-chip-grid">
            {POPULAR_LEAGUES.map((lg) => (
              <button
                key={lg.code}
                type="button"
                onClick={() => toggleLeague(lg.code)}
                className={
                  localLeagues.includes(lg.code)
                    ? "prefs-chip prefs-chip-active"
                    : "prefs-chip"
                }
              >
                {lg.label}
              </button>
            ))}
          </div>
        </section>

        {/* TEAMS */}
        <section className="prefs-section">
          <div className="prefs-section-header">
            <h4>Teams</h4>
            <input
              type="text"
              placeholder="Search team…"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="prefs-search"
            />
          </div>
          <div className="prefs-chip-grid">
            {filteredTeams.map((team) => (
              <button
                key={team}
                type="button"
                onClick={() => toggleTeam(team)}
                className={
                  localTeams.includes(team)
                    ? "prefs-chip prefs-chip-active"
                    : "prefs-chip"
                }
              >
                {team}
              </button>
            ))}
          </div>
        </section>

        <div className="prefs-footer">
          <button className="prefs-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="prefs-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save favourites"}
          </button>
        </div>
      </div>
    </div>
  );
}