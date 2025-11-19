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
import { fetchCurrentUser } from "../api"; // <- /auth/me wrapper

const AuthContext = createContext(null);
export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthGate({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null); // backend user row (incl is_premium)
  const [initializing, setInitializing] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const p = await fetchCurrentUser(); // calls /auth/me
        setProfile(p);
      } catch (err) {
        // 401 or other error => treat as no backend profile yet
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
      // firebase user present -> fetch backend profile
      loadProfile();
    });

    // If Firebase rotates the ID token, reload profile (optional but nice)
    const unsubToken = onIdTokenChanged(auth, (u) => {
      if (!u) {
        setFirebaseUser(null);
        setProfile(null);
        return;
      }
      // we already have user, but token changed – you *can* refresh profile here
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

  const value = {
    firebaseUser,
    profile,
    isPremium: !!profile?.is_premium,
    initializing: initializing || loadingProfile,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}