// src/components/learner/LearnerLayout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import LearnerHeader from "./LearnerHeader";
import LearnerSidebar from "./LearnerSidebar";

export default function LearnerLayout({ children }) {
  return (
    <div className="shell-root theme-learner">
      <LearnerSidebar className="shell-sidebar" />
      <div className="shell-main">
        <LearnerHeader className="shell-header" />
        <main className="shell-content">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}
