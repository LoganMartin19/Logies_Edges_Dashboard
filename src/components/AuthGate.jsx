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
import { ensureWebPushForCurrentUser } from "../pushNotifications";

const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGate({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // backend /auth/me payload
  const [initializing, setInitializing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Track whether we've already tried to register push for this session
  const [pushRegistered, setPushRegistered] = useState(false);

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
        setPushRegistered(false); // reset on logout
        return;
      }
      loadProfile();
    });

    const unsubToken = onIdTokenChanged(auth, (u) => {
      if (!u) {
        setFirebaseUser(null);
        setProfile(null);
        setPushRegistered(false);
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

  // Once logged in, try to register web push token (FCM)
  useEffect(() => {
    if (!firebaseUser || pushRegistered) return;

    (async () => {
      try {
        await ensureWebPushForCurrentUser();
      } catch (e) {
        console.error("[AuthGate] web push registration failed", e);
      } finally {
        setPushRegistered(true);
      }
    })();
  }, [firebaseUser, pushRegistered]);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

  const logout = async () => {
    await signOut(auth);
    setFirebaseUser(null);
    setProfile(null);
    setPushRegistered(false);
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
    isAdmin, // use this for /admin route + nav
    loading, // general "auth still loading" flag
    initializing,

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