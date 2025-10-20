// src/components/admin/AdminSidebar.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import { getMenuForRole } from "../../config/menu";

export default function AdminSidebar({ user }) {
  const role = user?.role || "admin";
  const menu = getMenuForRole(role);

  return (
    <aside className="admin-sidebar">
      <h2>AESP Admin</h2>
      <ul>
        {menu.map(item => (
          <li key={item.id}>
            <NavLink to={item.path}>
              <span>{item.icon}</span> {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </aside>
  );
}
