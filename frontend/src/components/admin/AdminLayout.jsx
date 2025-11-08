// src/components/admin/AdminLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

/**
 * AdminLayout
 * - Sidebar bên trái
 * - Header phía trên
 * - Breadcrumbs (nếu cần)
 * - Nội dung chính (Outlet)
 */
export default function AdminLayout({ children }) {
  return (
    <div className="shell-root theme-admin">
      {/* Sidebar */}
      <aside className="shell-sidebar">
        <AdminSidebar />
      </aside>

      {/* Main content */}
      <div className="shell-main">
        {/* Header */}
        <header className="shell-header">
          <AdminHeader />
        </header>

        {/* Breadcrumbs */}
        <div className="admin-breadcrumbs">
          {/* Bạn có thể render breadcrumbs động ở đây */}
        </div>

        {/* Nội dung chính */}
        <main className="shell-content">
          {/* Nếu có children thì render, nếu không thì render Outlet */}
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
