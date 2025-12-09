// src/context/PreferencesContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { getMyPreferences, saveMyPreferences } from "../api";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [favoriteSports, setFavoriteSports] = useState([]);   // 👈 NEW
  const [favoriteTeams, setFavoriteTeams] = useState([]);
  const [favoriteLeagues, setFavoriteLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await getMyPreferences();
        if (!mounted) return;

        setFavoriteSports(data.favorite_sports || []);        // 👈 NEW
        setFavoriteTeams(data.favorite_teams || []);
        setFavoriteLeagues(data.favorite_leagues || []);
      } catch (err) {
        // if unauthenticated, just treat as empty prefs
        if (err?.response?.status === 401) {
          if (mounted) {
            setFavoriteSports([]);
            setFavoriteTeams([]);
            setFavoriteLeagues([]);
          }
        } else {
          console.error("Failed to load preferences", err);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 👇 now accepts favoriteSports too
  const updatePreferences = async ({
    favoriteSports,
    favoriteTeams,
    favoriteLeagues,
  }) => {
    setSaving(true);
    try {
      const payload = {
        favorite_sports: favoriteSports,
        favorite_teams: favoriteTeams,
        favorite_leagues: favoriteLeagues,
      };
      const data = await saveMyPreferences(payload);
      setFavoriteSports(data.favorite_sports || []);
      setFavoriteTeams(data.favorite_teams || []);
      setFavoriteLeagues(data.favorite_leagues || []);
    } catch (err) {
      console.error("Failed to save preferences", err);
    } finally {
      setSaving(false);
    }
  };

  const value = {
    favoriteSports,
    favoriteTeams,
    favoriteLeagues,
    loading,
    saving,
    updatePreferences,
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return ctx;
}