// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAuth } from "../utils/auth";

export default function ProtectedRoute({ children, requiredRole }) {
  const auth = getAuth();
  const location = useLocation();

  if (!auth?.token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const userRole = String(auth?.user?.role ?? "").toLowerCase();
  if (requiredRole && userRole !== requiredRole.toLowerCase()) {
    return <Navigate to="/" replace />;
  }

  return children ?? <Outlet />;
}
