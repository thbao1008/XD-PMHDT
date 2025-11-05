import React from "react";
import { Outlet } from "react-router-dom";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <AdminSidebar />
      <div className="shell-main">
  <div className="shell-content">
    <Outlet />
  </div>
</div>

      {/* Main */}
      <div className="admin-main">
        <AdminHeader />

        {/* Breadcrumbs */}
        <div className="admin-breadcrumbs">
          {/* Breadcrumbs hiển thị đường dẫn */}
        </div>

        {/* Content */}
        <main className="admin-content">
          {children || <Outlet />}
        </main>
    
      </div>
    </div>
  );
}
