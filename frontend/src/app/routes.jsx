import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MENU } from "../config/menu.jsx";
import { ROUTE_MAP } from "../config/routeMap.jsx";

import Login from "../pages/Login.jsx";
import NotFound from "../pages/NotFound.jsx";

import AdminLayout from "../components/admin/AdminLayout.jsx";
import ProtectedRoute from "../components/ProtectedRoute.jsx";

import Dashboard from "../components/admin/Dashboard.jsx";
import UsersList from "../components/admin/UsersList.jsx";
import MentorsList from "../components/admin/MentorsList.jsx";
import PackagesList from "../components/admin/PackagesList.jsx";
import PurchasesList from "../components/admin/PurchasesList.jsx";
import ReportsPage from "../components/admin/ReportsPage.jsx";
import SupportTickets from "../components/admin/SupportTickets.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />

      {/* Debug: kiểm tra router mount */}
      <Route path="/__test" element={<div style={{ padding: 20 }}>TEST RENDER OK</div>} />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<UsersList />} />
        <Route path="mentors" element={<MentorsList />} />
        <Route path="packages" element={<PackagesList />} />
        <Route path="purchases" element={<PurchasesList />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="support" element={<SupportTickets />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* redirect legacy admin login to /login */}
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
