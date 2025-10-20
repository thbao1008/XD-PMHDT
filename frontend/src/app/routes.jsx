import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MENU } from "../config/menu.jsx";
import { ROUTE_MAP } from "../config/routeMap.jsx";

import Login from "../pages/Login.jsx";
import AdminLogin from "../pages/AdminLogin.jsx";
import NotFound from "../pages/NotFound.jsx";

// Component render route theo role
function RoleRoutes({ role }) {
  return (
    <Routes>
      {MENU.filter(m => m.role.includes(role)).map(item => {
        const Comp = ROUTE_MAP[item.id] || (() => <div>{item.label}</div>);
        // bỏ prefix /admin, /mentor, /learn để nested route hoạt động
        const path = item.path.replace(/^\/(admin|mentor|learn)/, "");
        return <Route key={item.id} path={path || ""} element={<Comp />} />;
      })}
      {/* fallback nếu không match */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      {/* Role-based routes */}
      <Route path="/admin/*" element={<RoleRoutes role="admin" />} />
      <Route path="/mentor/*" element={<RoleRoutes role="mentor" />} />
      <Route path="/learn/*" element={<RoleRoutes role="learner" />} />

      {/* Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
