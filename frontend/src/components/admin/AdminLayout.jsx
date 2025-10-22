// src/components/admin/AdminLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="shell-root theme-admin">
      <AdminSidebar />
      <div className="shell-main">
        <AdminHeader />
        <main className="shell-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
  