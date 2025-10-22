// src/components/admin/AdminSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { MENU } from "../../config/menu.jsx";
import { getAuth } from "../../utils/auth";

export default function AdminSidebar({ basePath = "/admin", roleOverride = null, collapsed = false }) {
  const auth = getAuth();
  const role = roleOverride || auth?.user?.role || "guest";

  const menuArray = Array.isArray(MENU) ? MENU : [];

  const filtered = React.useMemo(() => {
    return menuArray.filter((m) => {
      if (!m) return false;
      if (!m.role) return true;
      if (Array.isArray(m.role)) return m.role.includes(role);
      return String(m.role) === String(role);
    });
  }, [menuArray, role]);

  function buildTo(raw = "/") {
    if (typeof raw !== "string") return basePath;
    if (/^https?:\/\//.test(raw)) return raw;
    const normalized = raw.startsWith("/") ? raw : `/${raw}`;
    if (normalized === "/") return basePath;
    return normalized.startsWith(basePath) ? normalized : `${basePath}${normalized}`;
  }

  return (
    <aside className={`shell-sidebar${collapsed ? " collapsed" : ""}`} role="navigation" aria-label="Admin sidebar">
      <nav className="sidebar-nav" aria-label="Main navigation">
        {filtered.length === 0 && (
          <div className="muted" style={{ padding: 12 }}>No menu items available</div>
        )}

        {filtered.map((item) => {
          const to = buildTo(item.path);
          const key = item.id ?? item.label ?? to;
          const isExternal = typeof to === "string" && /^https?:\/\//.test(to);

          if (isExternal) {
            return (
              <a
                key={key}
                href={to}
                className="sidebar-link"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="link-icon" aria-hidden>{item.icon ?? "🔗"}</span>
                <span className="link-label">{item.label}</span>
              </a>
            );
          }

          return (
            <NavLink
              key={key}
              to={to}
              end={to === basePath}
              className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
            >
              <span className="link-icon" aria-hidden>{item.icon ?? "📁"}</span>
              <span className="link-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
