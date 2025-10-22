// src/components/learner/LearnerSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { MENU } from "../../config/menu";
import { getAuth } from "../../utils/auth";

export default function LearnerSidebar({ basePath = "/learn", collapsed = false }) {
  const auth = getAuth();
  const role = auth?.user?.role || "guest";

  const learnerMenu = Array.isArray(MENU)
    ? MENU.filter((m) => m.role?.includes("learner"))
    : [];

  return (
    <aside
      className={`shell-sidebar${collapsed ? " collapsed" : ""}`}
      role="navigation"
      aria-label="Learner sidebar"
    >
      <nav className="sidebar-nav" aria-label="Learner navigation">
        {learnerMenu.length === 0 && (
          <div className="muted" style={{ padding: 12 }}>
            No menu items available
          </div>
        )}

        {learnerMenu.map((item) => (
          <NavLink
            key={item.id ?? item.label}
            to={item.path}
            end={item.path === basePath}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            <span className="link-icon" aria-hidden>
              {item.icon ?? "📁"}
            </span>
            <span className="link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
