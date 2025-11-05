// src/components/AuthGate.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { api } from "../api"; // 👈 use the shared axios instance

const AuthContext = createContext(null);
export function useAuth() { return useContext(AuthContext); }

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      // attach (or clear) token on axios instance
      if (u) {
        const token = await u.getIdToken();
        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        delete api.defaults.headers.common["Authorization"];
      }
      setInitializing(false);
    });
    return () => unsub();
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);

  const logout = async () => {
    await signOut(auth);
    delete api.defaults.headers.common["Authorization"];
  };

  const value = { user, initializing, loginWithGoogle, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}