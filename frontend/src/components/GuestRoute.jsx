// src/components/GuestRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { getAuth } from "../utils/auth";

export default function GuestRoute({ children }) {
  const auth = getAuth();

  if (auth?.token) {
    switch (auth.user.role) {
      case "admin":
        return <Navigate to="/admin/dashboard" replace />;
      case "mentor":
        return <Navigate to="/mentor/dashboard" replace />;
      case "learner":
        return <Navigate to="/learn/catalog" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }

  return children;
}
