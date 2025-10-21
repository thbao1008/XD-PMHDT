import React from "react";
import { NavLink } from "react-router-dom";
import { MENU } from "../../config/menu.jsx";

export default function AdminSidebar({ collapsed = false, onToggle }) {
  const adminMenu = MENU.filter(m => m.role.includes("admin"));

  return (
    <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <img src="/assets/images/logo.png" alt="logo" className="sidebar-logo" />
          {!collapsed && <div className="sidebar-title">ASEP Admin</div>}
        </div>
        <button className="sidebar-collapse-btn" onClick={onToggle}>
          {collapsed ? "☰" : "×"}
        </button>
      </div>

      <nav className="sidebar-nav">
        {adminMenu.map(item => {
          const to = item.path.replace(/^\/admin/, "") || "/";
          return (
            <NavLink
              key={item.id}
              to={to}
              end={to === "/"}
              className={({ isActive }) => "sidebar-link" + (isActive ? " active" : "")}
            >
              <span className="link-icon">{item.icon || "📁"}</span>
              {!collapsed && <span className="link-label">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
