// src/components/mentor/MentorLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import MentorHeader from "./MentorHeader";
import MentorSidebar from "./MentorSidebar";

export default function MentorLayout({ children }) {
  return (
    <div className="shell-root theme-mentor">
      <MentorSidebar />
      <div className="shell-main">
        <MentorHeader />
        <main className="shell-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
