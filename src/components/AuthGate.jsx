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
  const [profile, setProfile] = useState(null); // backend user row
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
      // Optional: could refresh profile here
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

  // 🔥 New: let other components (like PremiumPage) update premium flag
  const updatePremiumStatus = (isPremiumFlag) => {
    setProfile((prev) =>
      prev ? { ...prev, is_premium: !!isPremiumFlag } : prev
    );
  };

  const value = {
    // Stripe/Firebase data
    firebaseUser,
    profile,
    backendUser: profile,
    isPremium: !!profile?.is_premium,

    // Backwards compat
    user: firebaseUser,

    initializing: initializing || loadingProfile,
    loginWithGoogle,
    logout,

    // NEW
    updatePremiumStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}