import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../services/authService";
import { saveAuth } from "../utils/auth";
import "../styles/login.css";

import logo from "../assets/images/logo.png";
import bg from "../assets/images/background.png";

export default function Login({ onLogin }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [mode, setMode] = useState("login"); // "login" | "reset" | "newpass"
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");

    if (!identifier.trim()) return setError("Vui lòng nhập email hoặc số điện thoại.");
    if (!password) return setError("Vui lòng nhập mật khẩu.");

    setLoading(true);
    try {
      const result = await apiLogin(identifier.trim(), password);
      const { token, user } = result.data || result;
      if (!token || !user) throw new Error(result?.message || "Phản hồi đăng nhập không hợp lệ");

      saveAuth({ token, user }, remember);
      onLogin?.(user);

      document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
      document.body.classList.add(`theme-${user.role?.toLowerCase() || "learner"}`);

      const role = user.role?.toLowerCase();
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "mentor") navigate("/mentor", { replace: true });
      else navigate("/learn", { replace: true });
    } catch (err) {
      setError(err?.message || "Sai tài khoản hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetRequest(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!identifier.trim() || !code.trim() || !fullName.trim() || !dob.trim()) {
      return setError("Vui lòng nhập đầy đủ thông tin");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code, fullName, dob }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Yêu cầu thất bại");

      setResetToken(data.resetToken);
      setMode("newpass");
      setMessage("Xác thực thành công, vui lòng nhập mật khẩu mới");
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetConfirm(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!newPassword.trim()) return setError("Vui lòng nhập mật khẩu mới");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Cập nhật thất bại");

      setMessage("✅ Cập nhật mật khẩu thành công. Quay lại đăng nhập...");
      setTimeout(() => setMode("login"), 2500);
    } catch (err) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      {/* Background trực tiếp bằng backgroundImage */}
      <div
        className="hero-bg"
        style={{ backgroundImage: `url(${bg})` }}
      />

      {/* Logo */}
      <div className="brand">
        <img src={logo} alt="AESP Logo" className="brand-logo" />
      </div>

      {/* Card */}
      <div className="login-card">
        {mode === "login" && (
          <>
            <h1 className="card-title">Đăng nhập luyện nói tiếng Anh</h1>
            <p className="card-subtitle">
              Talk fluently every day with authentic AI English partner
            </p>

            <form className="form" onSubmit={handleLogin} noValidate>
              <div className="field">
                <label>Email hoặc Số điện thoại</label>
                <input
                  type="text"
                  className={`input ${error ? "error" : ""}`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Nhập email hoặc số điện thoại"
                />
              </div>

              <div className="field">
                <label>Mật khẩu</label>
                <div className="input-group password-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`input ${error ? "error" : ""}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword((s) => !s)}
                  >
                    {showPassword ? "Ẩn" : "Hiện"}
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
                  onClick={() => setMode("reset")}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {error && <div className="error">{error}</div>}

              <button
                className={`button ${loading ? "loading" : ""}`}
                type="submit"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đăng nhập"}
              </button>
            </form>

            <div className="support-note">
              Tài khoản được tạo bởi quản trị viên. Cần hỗ trợ?{" "}
              <a href="tel:0123456789">
                <strong>0123456789</strong>
              </a>
            </div>
          </>
        )}

      {mode === "reset" && (
        <>
          <h1 className="card-title">Quên mật khẩu</h1>
          <p className="card-subtitle">Nhập thông tin xác thực để đặt lại mật khẩu</p>

          <form className="form" onSubmit={handleResetRequest} noValidate>
            <div className="field">
              <label>Email hoặc Số điện thoại</label>
              <input
                type="text"
                className="input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Leaner/Mentor code</label>
              <input
                type="text"
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Họ và tên</label>
              <input
                type="text"
                className="input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Ngày sinh</label>
              <input
                type="date"
                className="input"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
            </div>

            {error && <div className="error">{error}</div>}
            {message && <div className="note">{message}</div>}

            <div className="helper-row">
              <button type="button" className="help-link" onClick={() => setMode("login")}>
                ← Quay lại đăng nhập
              </button>
            </div>

            <button className="button" type="submit" disabled={loading}>
              {loading ? "Đang xử lý..." : "Xác nhận"}
            </button>
          </form>
        </>
      )}

      {mode === "newpass" && (
        <>
          <h1 className="card-title">Đặt mật khẩu mới</h1>
          <p className="card-subtitle">Nhập mật khẩu mới cho tài khoản của bạn</p>

          <form className="form" onSubmit={handleResetConfirm} noValidate>
            <div className="field">
              <label>Mật khẩu mới</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
              />
            </div>

            {error && <div className="error">{error}</div>}
            {message && <div className="note">{message}</div>}

            <div className="helper-row">
              <button type="button" className="help-link" onClick={() => setMode("login")}>
                ← Quay lại đăng nhập
              </button>
            </div>

            <button className="button" type="submit" disabled={loading}>
              {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
            </button>
          </form>
        </>
      )}
    </div>
  </div>)
}
