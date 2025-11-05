import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiHome, FiUsers, FiPackage,
  FiShoppingBag, FiBarChart2, FiLifeBuoy
} from "react-icons/fi";

export default function AdminSidebar({ collapsed = false }) {
  const [stats, setStats] = useState({ traffic: 0, online: 0 });

  function mockStats() {
    const randomTraffic = 5000; // cố định 5k (hoặc Math.floor(Math.random()*20000)+5000)
    const randomOnline = Math.floor(Math.random() * 500) + 50;
    setStats({ traffic: randomTraffic, online: randomOnline });
  }

  useEffect(() => {
    mockStats();
    const interval = setInterval(mockStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const menu = [
    { id: "dashboard", label: "Dashboard", icon: <FiHome />, to: "/admin" },
    { id: "users", label: "Users", icon: <FiUsers />, to: "/admin/users" },
    { id: "packages", label: "Packages", icon: <FiPackage />, to: "/admin/packages" },
    { id: "purchases", label: "Purchases", icon: <FiShoppingBag />, to: "/admin/purchases" },
    { id: "reports", label: "Reports", icon: <FiBarChart2 />, to: "/admin/reports" },
    { id: "support", label: "Support", icon: <FiLifeBuoy />, to: "/admin/support" }
  ];

  return (
    <aside className={`shell-sidebar${collapsed ? " collapsed" : ""}`}>
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

      {/* Block thống kê */}
      <div className="sidebar-stats">
        <div className="stat-item">
          <span className="stat-label">Lưu lượng</span>
          <span className="stat-value">{stats.traffic.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Đang online</span>
          <span className="stat-value">{stats.online}</span>
        </div>
      </div>
      <div className="sidebar-footer">
    {!collapsed && <span>© 2025 AESP Admin</span>} 
</div>

    </aside>
     
  );
}
