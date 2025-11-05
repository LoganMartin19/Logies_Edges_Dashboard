// src/components/AuthGate.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, onIdTokenChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { api } from "../api"; // 👈 use the shared axios instance

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const applyHeader = async (u) => {
      if (u) {
        const t = await u.getIdToken();
        api.defaults.headers.common.Authorization = `Bearer ${t}`;
      } else {
        delete api.defaults.headers.common.Authorization;
      }
    };
  
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      await applyHeader(u);
      setInitializing(false);
    });
  
    const unsubToken = onIdTokenChanged(auth, async (u) => {
      await applyHeader(u);   // refresh on rotation
    });
  
    return () => { unsubAuth(); unsubToken(); };
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

  const logout = async () => {
    await signOut(auth);
    delete api.defaults.headers.common["Authorization"];
  };

  const value = { user, initializing, loginWithGoogle, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}