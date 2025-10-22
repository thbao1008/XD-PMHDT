// src/components/learner/LearnerHeader.jsx
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, getAuth } from "../../utils/auth";
import logo from "../../assets/images/logo.png";
import userAvatar from "../../assets/icons/users.png";

export default function LearnerHeader() {
  const navigate = useNavigate();
  const auth = getAuth();
  const userName = auth?.user?.name || "Learner";

  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  function handleLogout() {
    clearAuth();
    navigate("/login", { replace: true });
  }

  function toggleDropdown() {
    setOpen((s) => !s);
  }

  useEffect(() => {
    function onClick(e) {
      if (!dropdownRef.current || !buttonRef.current) return;
      if (
        !dropdownRef.current.contains(e.target) &&
        !buttonRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="shell-header" role="banner">
      <div className="header-left">
        <img src={logo} alt="AESP logo" className="header-mark" />
      </div>

      <div className="header-center">
        <div className="welcome-text">
          Welcome, <strong>{userName}!</strong>
        </div>
      </div>

      <div className="header-right">
        <div className="user-menu">
          <button
            ref={buttonRef}
            className="user-dropdown-toggle"
            onClick={toggleDropdown}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <img
              src={auth?.user?.avatar || userAvatar}
              alt="User avatar"
              className="user-avatar"
            />
            <span className="user-name">{userName}</span>
            <span className="dropdown-icon">▾</span>
          </button>

          {open && (
            <div
              ref={dropdownRef}
              className="dropdown-menu"
              role="menu"
            >
              <button
                className="dropdown-item"
                onClick={() => {
                  navigate("/learn/profile");
                  setOpen(false);
                }}
              >
                Thông tin cá nhân
              </button>
              <div className="divider-hr" />
              <button className="dropdown-item danger" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
