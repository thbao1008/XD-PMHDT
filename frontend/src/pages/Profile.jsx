// src/pages/Profile.jsx
import React, { useState } from "react";
import { getAuth, saveAuth } from "../utils/auth";
import userAvatar from "../assets/icons/users.png";
import "../styles/profile.css";

export default function ProfilePage() {
  const auth = getAuth();
  const user = auth?.user;
  const [preview, setPreview] = useState(user?.avatar || null);

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  if (!user) return <div className="card">Bạn chưa đăng nhập.</div>;

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        saveAuth({ ...auth, user: { ...auth.user, avatar: reader.result } });
      };
      reader.readAsDataURL(file);
    }
  }

  function handleChangePassword(e) {
    e.preventDefault();
    setMessage("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage("Vui lòng nhập đầy đủ thông tin.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu mới và xác nhận không khớp.");
      return;
    }
    if (currentPassword !== "password") {
      setMessage("Mật khẩu hiện tại không đúng (mock).");
      return;
    }

    setMessage("Đổi mật khẩu thành công ✅ (mock).");
    setShowChangePassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="profile-fullscreen">
      <h2>Thông tin cá nhân</h2>

      <div className="profile-container">
        {/* Avatar + nút cập nhật */}
        <div className="profile-avatar">
          <img src={preview || userAvatar} alt={user.name} />
          <label className="upload-btn">
            Cập nhật ảnh
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
          </label>
        </div>

        {/* Thông tin chi tiết */}
        <div className="profile-details">
          <div className="info-row"><strong>Họ tên:</strong> {user.name}</div>
          <div className="info-row"><strong>Email:</strong> {user.email}</div>
          <div className="info-row"><strong>Số điện thoại:</strong> {user.phone}</div>
          <div className="info-row"><strong>Vai trò:</strong> {user.role}</div>

          {/* Nếu là learner thì hiển thị thêm gói học */}
          {user.role === "learner" && (
            <>
              <div className="info-row"><strong>Gói học:</strong> {user.packageName || "Chưa đăng ký"}</div>
              <div className="info-row"><strong>Kết thúc:</strong> {user.packageEnd || "N/A"}</div>
            </>
          )}

          {/* Nút đổi mật khẩu */}
          {!showChangePassword && (
            <button className="btn-link" onClick={() => setShowChangePassword(true)}> Đổi mật khẩu</button>
          )}

          {showChangePassword && (
            <div className="change-password">
              <h3>Đổi mật khẩu</h3>
              <form onSubmit={handleChangePassword}>
                <input type="password" placeholder="Mật khẩu hiện tại" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <input type="password" placeholder="Mật khẩu mới" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <input type="password" placeholder="Xác nhận mật khẩu mới" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="submit" className="btn-primary">Cập nhật</button>
                  <button type="button" className="btn-secondary" onClick={() => setShowChangePassword(false)}>Hủy</button>
                </div>
              </form>
              {message && <p className="message">{message}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
