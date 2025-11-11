import React from "react";
import { Outlet } from "react-router-dom";
import MentorHeader from "./MentorHeader";
import MentorSidebar from "./MentorSidebar";

export default function MentorLayout({ children }) {
  return (
    <div className="shell-root theme-mentor">
      {/* Sidebar */}
      <aside className="shell-sidebar">
        <MentorSidebar />
      </aside>

      {/* Main content */}
      <div className="shell-main">
        {/* Header */}
        <header className="shell-header">
          <MentorHeader />
        </header>

        {/* Breadcrumbs */}
        <div className="mentor-breadcrumbs">
          {/* Breadcrumbs động nếu cần */}
        </div>

        {/* Nội dung chính */}
        <main className="shell-content">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
