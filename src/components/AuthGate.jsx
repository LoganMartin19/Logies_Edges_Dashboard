// src/components/AuthGate.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { fetchCurrentUser } from "../api";

const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGate({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // backend /auth/me payload
  const [initializing, setInitializing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const p = await fetchCurrentUser(); // GET /auth/me
        setProfile(p);
      } catch {
        setProfile(null);
      } finally {
        setLoadingProfile(false);
        setInitializing(false);
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) {
        setProfile(null);
        setInitializing(false);
        return;
      }
      loadProfile();
    });

    const unsubToken = onIdTokenChanged(auth, (u) => {
      if (!u) {
        setFirebaseUser(null);
        setProfile(null);
        return;
      }
      // Optional: could refresh profile here if you want on token refresh
      // loadProfile();
    });

    return () => {
      unsubAuth();
      unsubToken();
    };
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

  const logout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setProfile(null);
  };

  // Allow other components (e.g. PremiumPage) to update premium flag
  const updatePremiumStatus = (isPremiumFlag) => {
    setProfile((prev) =>
      prev ? { ...prev, is_premium: !!isPremiumFlag } : prev
    );
  };

  const loading = initializing || loadingProfile;
  const isPremium = !!profile?.is_premium;
  const isAdmin = !!profile?.is_admin; // 👈 important bit

  const value = {
    // Raw Firebase user
    firebaseUser,

    // Backend user from /auth/me
    profile,
    backendUser: profile,

    // Convenience flags
    isPremium,
    isAdmin,          // 👈 use this for /admin route + nav
    loading,          // general "auth still loading" flag
    initializing,     // original flag if you still use it anywhere

    // Backwards compat: some places use `user` as Firebase user
    user: firebaseUser,

    // Actions
    loginWithGoogle,
    logout,
    updatePremiumStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}