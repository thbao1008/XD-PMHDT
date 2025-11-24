import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin } from "../services/authService";
import { saveAuth } from "../utils/auth";
import api from "../api.js";
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

  // Forgot password states
  const [mode, setMode] = useState("login"); // "login" | "forgot-step1" | "forgot-step2" | "forgot-step3"
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [resetToken, setResetToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!identifier.trim()) return setError("Vui lòng nhập email hoặc số điện thoại.");
    if (!password) return setError("Vui lòng nhập mật khẩu.");

    setLoading(true);
    try {
      const result = await apiLogin(identifier.trim(), password);
      const { token, user } = result;
      if (!token || !user) throw new Error("Phản hồi đăng nhập không hợp lệ");

      saveAuth({ token, user }, remember);
      onLogin?.(user);

      document.body.classList.remove("theme-admin", "theme-mentor", "theme-learner");
      document.body.classList.add(`theme-${user.role?.toLowerCase() || "learner"}`);

      const role = user.role?.toLowerCase();
      if (role === "admin") navigate("/admin", { replace: true });
      else if (role === "mentor") navigate("/mentor", { replace: true });
      else navigate("/learn", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError(err?.message || "Sai tài khoản hoặc mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  // Step 1: Request security question
  async function handleForgotStep1(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!identifier.trim()) {
      return setError("Vui lòng nhập email hoặc số điện thoại");
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { identifier: identifier.trim() });
      setSecurityQuestion(res.data.security_question);
      setMessage("Vui lòng trả lời câu hỏi bảo mật");
      setMode("forgot-step2");
    } catch (err) {
      setError(err?.response?.data?.message || "Không tìm thấy tài khoản hoặc tài khoản chưa thiết lập câu hỏi bảo mật");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify security answer
  async function handleForgotStep2(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!securityAnswer.trim()) {
      return setError("Vui lòng nhập câu trả lời");
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/verify-security-answer", {
        identifier: identifier.trim(),
        security_answer: securityAnswer.trim()
      });
      setResetToken(res.data.resetToken);
      setMessage("Xác thực thành công. Vui lòng đặt mật khẩu mới");
      setMode("forgot-step3");
    } catch (err) {
      setError(err?.response?.data?.message || "Câu trả lời không đúng");
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Reset password
  async function handleForgotStep3(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!newPassword.trim()) {
      return setError("Vui lòng nhập mật khẩu mới");
    }
    if (newPassword.length < 6) {
      return setError("Mật khẩu phải có ít nhất 6 ký tự");
    }
    if (newPassword !== confirmPassword) {
      return setError("Mật khẩu xác nhận không khớp");
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        token: resetToken,
        newPassword: newPassword.trim()
      });
      setMessage("✅ Đặt lại mật khẩu thành công. Đang chuyển về trang đăng nhập...");
      setTimeout(() => {
        setMode("login");
        setIdentifier("");
        setSecurityQuestion("");
        setSecurityAnswer("");
        setResetToken(null);
        setNewPassword("");
        setConfirmPassword("");
        setMessage("");
      }, 2000);
    } catch (err) {
      setError(err?.response?.data?.message || "Có lỗi xảy ra khi đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  function resetForgotPassword() {
    setMode("login");
    setIdentifier("");
    setSecurityQuestion("");
    setSecurityAnswer("");
    setResetToken(null);
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
  }

  return (
    <div className="login-wrap">
      {/* Background */}
      <div
        className="hero-bg"
        style={{ backgroundImage: `url(${bg})` }}
      />

      {/* Logo */}
      <div
        className="brand cursor-pointer transition-transform duration-200 hover:scale-105 hover:opacity-90"
        onClick={() => navigate("/")}
      >
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
                <label className="label">Email hoặc Số điện thoại</label>
                <input
                  type="text"
                  className={`input ${error ? "error" : ""}`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Nhập email hoặc số điện thoại"
                  autoComplete="username"
                />
              </div>

              <div className="field">
                <label className="label">Mật khẩu</label>
                <div className="input-group password-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`input ${error ? "error" : ""}`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    autoComplete="current-password"
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
                  onClick={() => {
                    resetForgotPassword();
                    setMode("forgot-step1");
                  }}
                >
                  Quên mật khẩu?
                </button>
              </div>

              {error && <div className="error">{error}</div>}
              {message && <div className="note">{message}</div>}

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

        {/* Step 1: Nhập email/phone */}
        {mode === "forgot-step1" && (
          <>
            <h1 className="card-title">Quên mật khẩu</h1>
            <p className="card-subtitle">Nhập email hoặc số điện thoại để lấy câu hỏi bảo mật</p>

            <form className="form" onSubmit={handleForgotStep1} noValidate>
              <div className="field">
                <label className="label">Email hoặc Số điện thoại</label>
                <input
                  type="text"
                  className={`input ${error ? "error" : ""}`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Nhập email hoặc số điện thoại"
                  autoComplete="username"
                />
              </div>

              {error && <div className="error">{error}</div>}
              {message && <div className="note">{message}</div>}

              <div className="helper-row">
                <button type="button" className="help-link" onClick={resetForgotPassword}>
                  ← Quay lại đăng nhập
                </button>
              </div>

              <button
                className={`button ${loading ? "loading" : ""}`}
                type="submit"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Tiếp theo"}
              </button>
            </form>
          </>
        )}

        {/* Step 2: Trả lời câu hỏi bảo mật */}
        {mode === "forgot-step2" && (
          <>
            <h1 className="card-title">Câu hỏi bảo mật</h1>
            <p className="card-subtitle">Vui lòng trả lời câu hỏi bảo mật của bạn</p>

            <form className="form" onSubmit={handleForgotStep2} noValidate>
              <div className="field">
                <label className="label">Câu hỏi bảo mật</label>
                <div className="security-question-box">
                  {securityQuestion}
                </div>
              </div>

              <div className="field">
                <label className="label">Câu trả lời</label>
                <input
                  type="text"
                  className={`input ${error ? "error" : ""}`}
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  placeholder="Nhập câu trả lời"
                  autoComplete="off"
                />
              </div>

              {error && <div className="error">{error}</div>}
              {message && <div className="note">{message}</div>}

              <div className="helper-row">
                <button type="button" className="help-link" onClick={() => setMode("forgot-step1")}>
                  ← Quay lại
                </button>
              </div>

              <button
                className={`button ${loading ? "loading" : ""}`}
                type="submit"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Xác nhận"}
              </button>
            </form>
          </>
        )}

        {/* Step 3: Đặt mật khẩu mới */}
        {mode === "forgot-step3" && (
          <>
            <h1 className="card-title">Đặt mật khẩu mới</h1>
            <p className="card-subtitle">Nhập mật khẩu mới cho tài khoản của bạn</p>

            <form className="form" onSubmit={handleForgotStep3} noValidate>
              <div className="field">
                <label className="label">Mật khẩu mới</label>
                <input
                  type="password"
                  className={`input ${error ? "error" : ""}`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  autoComplete="new-password"
                />
              </div>

              <div className="field">
                <label className="label">Xác nhận mật khẩu</label>
                <input
                  type="password"
                  className={`input ${error ? "error" : ""}`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  autoComplete="new-password"
                />
              </div>

              {error && <div className="error">{error}</div>}
              {message && <div className="note">{message}</div>}

              <div className="helper-row">
                <button type="button" className="help-link" onClick={() => setMode("forgot-step2")}>
                  ← Quay lại
                </button>
              </div>

              <button
                className={`button ${loading ? "loading" : ""}`}
                type="submit"
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
