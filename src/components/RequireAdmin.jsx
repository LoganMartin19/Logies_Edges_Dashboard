// src/components/RequireAdmin.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthGate";

export default function RequireAdmin({ children }) {
  const { loading, firebaseUser, isAdmin } = useAuth();
  const location = useLocation();

  // Still loading auth/profile – avoid flicker
  if (loading) {
    return (
      <div style={{ padding: 24, color: "#eaf4ed" }}>
        Checking permissions…
      </div>
    );
  }

  // Not logged in → go to login
  if (!firebaseUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <div style={{ padding: 24, color: "#eaf4ed" }}>
        <h2>Not authorised</h2>
        <p>You don’t have permission to view this page.</p>
      </div>
    );
  }

  // ✅ Admin user → show the admin content
  return children;
}