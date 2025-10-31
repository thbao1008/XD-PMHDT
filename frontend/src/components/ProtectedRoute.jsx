import React from "react";
import { Navigate } from "react-router-dom";
import { getAuth } from "../utils/auth";

export default function ProtectedRoute({ children, requiredRole }) {
  const auth = getAuth();
  const userRole = auth?.user?.role?.toLowerCase();

  // 👉 log để debug
  console.log("🔐 ProtectedRoute check:", { auth, userRole, requiredRole });

  if (!auth || !auth.token) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole.toLowerCase()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
