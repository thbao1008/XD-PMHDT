import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../services/authService";
import { saveAuth } from "../utils/auth";
import "../styles/login.css";

import logo from "../assets/images/logo.png";
import bg from "../assets/images/background.png";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [identifier, setIdentifier] = useState(""); // email or phone
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    const trimmedIdentifier = (identifier || "").trim();
    if (!trimmedIdentifier) return setError("Vui lòng nhập email hoặc số điện thoại.");
    if (!password) return setError("Vui lòng nhập mật khẩu.");

    setLoading(true);
    try {
      const result = await apiLogin(trimmedIdentifier, password);

      if (!result || !result.user) {
        throw new Error("Phản hồi đăng nhập không hợp lệ");
      }

      const { token, user } = result;

      saveAuth({ token, user }, remember);
      onLogin?.(user);

      // chỉ dùng user.role khi chắc chắn user tồn tại
      const roleClass = `theme-${user.role || "learner"}`;
      document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
      document.body.classList.add(roleClass);

      if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "mentor") navigate("/mentor", { replace: true });
      else navigate("/learn", { replace: true });
    } catch (err) {
      setError(err?.message || "Lỗi đăng nhập");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!resetEmail.trim()) return setError("Vui lòng nhập email khôi phục.");

    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setInfo("Yêu cầu cấp lại mật khẩu đã được gửi. Vui lòng kiểm tra email.");
      setTimeout(() => {
        setMode("login");
        setResetEmail("");
      }, 1500);
    } catch (err) {
      setError("Không thể gửi yêu cầu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="hero-bg" style={{ "--hero-url": `url(${bg})` }} />

      <div className="brand">
        <img src={logo} alt="AESP Logo" className="brand-logo" />
        <div className="brand-name">AESP</div>
      </div>

      <div className="login-card" role="region" aria-label="Login card">
        <h1 className="card-title">Đăng nhập luyện nói tiếng Anh</h1>
        <p className="card-subtitle">Talk fluently every day with authentic AI English partner</p>

        {mode === "login" ? (
          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label className="label" htmlFor="identifier">Email hoặc Số điện thoại</label>
              <div className="input-group">
                <input
                  id="identifier"
                  type="text"
                  className={`input ${error ? "error" : ""}`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  placeholder="Nhập email hoặc số điện thoại"
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="password">Mật khẩu</label>
              <div className="input-group password-group">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`input ${error ? "error" : ""}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Mật khẩu"
                  aria-describedby="toggle-password"
                />
                <button
                  id="toggle-password"
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-5 0-9.27-3.11-11-8"/>
                      <path d="M1 1l22 22"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="helper-row">
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Ghi nhớ</span>
              </label>

              <button
                type="button"
                className="help-link"
                onClick={() => {
                  setError("");
                  setInfo("");
                  setMode("forgot");
                }}
              >
                Quên mật khẩu?
              </button>
            </div>

            {error && <div className="error" role="alert">{error}</div>}
            {info && <div className="note" role="status">{info}</div>}

            <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
              <button className={`button ${loading ? "loading" : ""}`} type="submit" disabled={loading}>
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </button>
            </div>

            <div className="note">Tài khoản được cấp bởi quản trị viên.</div>
            <div className="note">
              Chưa có tài khoản? <a href="#contact" style={{ color: "var(--primary)", textDecoration: "none" }}>Liên hệ với chúng tôi 0123.456.789.</a>
            </div>
          </form>
        ) : (
          <form className="form" onSubmit={handleForgot} noValidate>
            <div className="field">
              <label className="label" htmlFor="resetEmail">Email khôi phục</label>
              <div className="input-group">
                <input
                  id="resetEmail"
                  type="email"
                  className={`input ${error ? "error" : ""}`}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Nhập email đã đăng ký"
                  autoComplete="email"
                />
              </div>
            </div>

            {error && <div className="error" role="alert">{error}</div>}
            {info && <div className="note" role="status">{info}</div>}

            <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center" }}>
              <button className="button" type="submit" disabled={loading}>
                {loading ? "Đang gửi..." : "Gửi yêu cầu"}
              </button>
              <button
                type="button"
                className="help-link"
                onClick={() => {
                  setError("");
                  setInfo("");
                  setMode("login");
                }}
              >
                ← Quay lại đăng nhập
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
