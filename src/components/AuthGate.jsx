import React from "react";
import useAuth from "../hooks/useAuth";

export default function AuthGate({ children, fallback = null }) {
  const { user, loading } = useAuth();
  if (loading) return fallback ?? <div style={{padding:16}}>Loading…</div>;
  if (!user)   return fallback ?? <div style={{padding:16}}>Please sign in.</div>;
  return children;
}