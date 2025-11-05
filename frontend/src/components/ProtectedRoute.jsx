// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { getAuth } from "../utils/auth";

export default function ProtectedRoute({ children, requiredRole }) {
  const auth = getAuth();

  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && auth.user.role !== requiredRole.toLowerCase()) {
    return <Navigate to="/" replace />;
  }

  return children;
}
