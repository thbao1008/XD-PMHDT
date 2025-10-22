// src/components/mentor/MentorSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { MENU } from "../../config/menu";
import { getAuth } from "../../utils/auth";

export default function MentorSidebar({ basePath = "/mentor", collapsed = false }) {
  const auth = getAuth();
  const role = auth?.user?.role || "guest";

  const mentorMenu = Array.isArray(MENU)
    ? MENU.filter((m) => m.role?.includes("mentor"))
    : [];

  return (
    <aside
      className={`shell-sidebar${collapsed ? " collapsed" : ""}`}
      role="navigation"
      aria-label="Mentor sidebar"
    >
      <nav className="sidebar-nav" aria-label="Mentor navigation">
        {mentorMenu.length === 0 && (
          <div className="muted" style={{ padding: 12 }}>
            No menu items available
          </div>
        )}

        {mentorMenu.map((item) => (
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
