import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../services/authService";
import { saveAuth } from "../utils/auth";
import "../styles/login.css";

// 👉 import ảnh từ src/assets
import logo from "../assets/images/logo.png";
import bg from "../assets/images/background.png";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username.trim()) return setError("Vui lòng nhập tên đăng nhập.");
    if (!password) return setError("Vui lòng nhập mật khẩu.");

    setLoading(true);
    try {
      const { token, user } = await apiLogin(username, password);
      saveAuth({ token, user }, remember);
      onLogin?.(user);

      if (user.role === "admin") navigate("/admin", { replace: true });
      else if (user.role === "mentor") navigate("/mentor", { replace: true });
      else navigate("/learn", { replace: true });
    } catch (err) {
      setError(err?.message || "Lỗi đăng nhập");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      {/* Background minh họa */}
      <div
        className="hero-bg"
        style={{ "--hero-url": `url(${bg})` }}
      />

      {/* Logo góc trái */}
      <div className="brand">
        <img src={logo} alt="AESP Logo" className="brand-logo" />
        <div className="brand-name">AESP</div>
      </div>

      {/* Card đăng nhập */}
      <div className="login-card">
        <h1 className="card-title">Đăng nhập luyện nói tiếng Anh</h1>
        <p className="card-subtitle">
          Talk fluently every day with authentic AI English partner
        </p>

        <form className="form" onSubmit={handleSubmit} noValidate>
          {/* Username */}
          <div className="field">
            <label className="label">Tên đăng nhập</label>
            <div className="input-group">
              <input
                type="text"
                className={`input ${error ? "error" : ""}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="field">
            <label className="label">Mật khẩu</label>
            <div className="input-group password-group">
              <input
                type={showPassword ? "text" : "password"}
                className={`input ${error ? "error" : ""}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? "Ẩn" : "Hiện"}
              </button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="helper-row">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>Ghi nhớ</span>
            </label>
            <a className="help-link" href="#forgot">Quên mật khẩu?</a>
          </div>

          {/* Error */}
          {error && <div className="error">{error}</div>}

          {/* Submit */}
          <button
            className={`button ${loading ? "loading" : ""}`}
            type="submit"
            disabled={loading}
          >
            {loading ? "Đang xử lý..." : "Đăng nhập"}
          </button>

          <div className="note">Tài khoản được cấp bởi quản trị viên.</div>
          <div className="note">
            Chưa có tài khoản?{" "}
            <a href="#contact">Liên hệ với chúng tôi ngay 0123.456.789.</a>
          </div>
        </form>
      </div>
    </div>
  );
}
  