// src/components/learner/LearnerSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { getAuth } from "../../utils/auth";
import {
  FaHome,
  FaBook,
  FaMicrophone,
  FaBolt,
  FaChartLine,
  FaComments,
  FaPen
} from "react-icons/fa";

export default function LearnerSidebar({ basePath = "/learn", collapsed = false }) {
  const auth = getAuth();
  const role = auth?.user?.role || "guest";

  const learnerMenu = [
    { id: "dashboard", label: "Dashboard", path: `${basePath}/dashboard`, icon: <FaHome /> },
    { id: "catalog", label: "Learning Catalog", path: `${basePath}/catalog`, icon: <FaBook /> },
    { id: "practice", label: "Speaking Practice", path: `${basePath}/practice`, icon: <FaMicrophone /> },
    { id: "challenges", label: "Challenges", path: `${basePath}/challenges`, icon: <FaBolt /> },
    { id: "communicate", label: "Communicate Center", path: `${basePath}/communicate`, icon: <FaComments /> },
    { id: "feedback", label: "Feedback", path: `${basePath}/feedback`, icon: <FaPen /> },
  ];

  return (
    <>
      <nav className="sidebar-nav" aria-label="Learner navigation">
        {learnerMenu.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            end={item.path === basePath}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            <span className="link-icon" aria-hidden>
              {item.icon}
            </span>
            {!collapsed && <span className="link-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && <span>© 2025 AESP Learner</span>}
      </div>
    </>
  );
}
