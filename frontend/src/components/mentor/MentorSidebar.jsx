// src/components/mentor/MentorSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiClipboard,
  FiMessageCircle,
  FiBookOpen,
  FiCalendar,
  FiUsers,
  FiFolder,
  FiShare2
} from "react-icons/fi";

export default function MentorSidebar({ collapsed = false }) {
  const menu = [
    { id: "dashboard", label: "Dashboard", icon: <FiHome />, to: "/mentor/dashboard" },
    { id: "assessment", label: "Assessment", icon: <FiClipboard />, to: "/mentor/assessment" },
    { id: "challenge-creator", label: "Challenge Creator", icon: <FiBookOpen />, to: "/mentor/challenge-creator" },
    { id: "schedules", label: "Schedules", icon: <FiCalendar />, to: "/mentor/schedules" },
    { id: "learners", label: "Learners", icon: <FiUsers />, to: "/mentor/learners" },
    { id: "resources", label: "Resources", icon: <FiFolder />, to: "/mentor/resources" },
    { id: "communicate", label: "Communicate", icon: <FiShare2 />, to: "/mentor/communicate" }
  ];

  return (
    <>
      <nav className="sidebar-nav">
        {menu.map((item) => (
          <NavLink
            key={item.id}
            to={item.to}
            className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
          >
            <span className="link-icon">{item.icon}</span>
            {!collapsed && <span className="link-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && <span>© 2025 AESP Mentor</span>}
      </div>
    </>
  );
}
