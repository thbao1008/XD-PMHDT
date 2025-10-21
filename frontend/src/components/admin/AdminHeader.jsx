import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, getAuth } from "../../utils/auth";

export default function AdminHeader({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const auth = getAuth();
  const userName = auth?.user?.name || "Admin";
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  return (
    <header className="admin-header">
      <div className="header-left">
        <button className="collapse-btn" onClick={onToggle} aria-label="Toggle sidebar">
          {collapsed ? "☰" : "×"}
        </button>
      </div>

      <div className="header-right">
        <div className="user-dropdown" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <img src="/assets/images/avatar.png" alt="avatar" className="user-avatar" />
          <span className="user-name">{userName}</span>
          <span className="dropdown-icon">▾</span>

          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-item">Thông tin cá nhân</div>
              <div className="dropdown-item" onClick={handleLogout}>Đăng xuất</div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
