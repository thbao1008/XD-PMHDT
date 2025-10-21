// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { getAuth } from "../utils/auth";

export default function ProtectedRoute({ children, requiredRole }) {
  const auth = getAuth();
  const userRole = auth?.user?.role;

  // Nếu chưa có session thì redirect về /login
  if (!auth || !auth.token) {
    return <Navigate to="/login" replace />;
  }

  // Nếu cần role cụ thể mà user không đáp ứng thì redirect về /login
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
