import React, { useState, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getAuth, saveAuth, clearAuth } from "../utils/auth";
import userAvatar from "../assets/icons/users.png";
import "../styles/profile.css";
import Cropper from "react-easy-crop";
import Modal from "react-modal";

export default function ProfilePage() {
  const auth = getAuth();
  const user = auth?.user;
  const navigate = useNavigate();
  const [preview, setPreview] = useState(user?.avatar_url || null);

  // cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  // 👉 Nếu chưa login thì redirect
  if (!user) return <Navigate to="/login" replace />;

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
      setShowCropper(true);
    }
  }

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  async function getCroppedImg(imageSrc, crop) {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => (image.onload = resolve));

    const canvas = document.createElement("canvas");
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg");
    });
  }

  async function handleConfirm() {
    try {
      const blob = await getCroppedImg(selectedImage, croppedAreaPixels);
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.jpg");

      const res = await fetch(`/api/users/${user.id}/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setPreview(data.user.avatar_url);
      saveAuth({ ...auth, user: data.user });
      setShowCropper(false);
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật ảnh");
    }
  }

  async function handleChangePassword(e) {
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

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          oldPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "Đổi mật khẩu thất bại");
        return;
      }

      setMessage("Đổi mật khẩu thành công ✅");
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setMessage("Lỗi kết nối server");
    }
  }

  // 👉 Hàm logout
  function handleLogout() {
    clearAuth();
    navigate("/login");
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
            <input type="file" onChange={handleFileChange} />
          </label>
        </div>

        {/* Modal cropper */}
        <Modal isOpen={showCropper} onRequestClose={() => setShowCropper(false)}>
          <div className="cropper-container">
            <Cropper
              image={selectedImage}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>
          <div className="modal-actions">
            <button className="btn-primary" onClick={handleConfirm}>Xác nhận</button>
            <button className="btn-secondary" onClick={() => setShowCropper(false)}>Hủy</button>
          </div>
        </Modal>

        {/* Thông tin chi tiết */}
        <div className="profile-details">
          <div className="info-row"><strong>Họ tên:</strong> {user.name}</div>
          <div className="info-row"><strong>Email:</strong> {user.email}</div>
          <div className="info-row"><strong>Số điện thoại:</strong> {user.phone}</div>
          <div className="info-row"><strong>Vai trò:</strong> {user.role}</div>
          <div className="info-row">
            <strong>Ngày sinh:</strong>{" "}
            {user.dob ? new Date(user.dob).toLocaleDateString("vi-VN") : "Chưa cập nhật"}
          </div>

          {!showChangePassword && (
            <button className="btn-link" onClick={() => setShowChangePassword(true)}>
              Đổi mật khẩu
            </button>
          )}

          {showChangePassword && (
            user.role === "admin" ? (
              <p style={{ color: "red", marginTop: "12px" }}>
                Liên hệ DEV để thay đổi mật khẩu
              </p>
            ) : (
              <div className="change-password">
                <h3>Đổi mật khẩu</h3>
                <form onSubmit={handleChangePassword}>
                  <input type="password" placeholder="Mật khẩu hiện tại"
                    value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  <input type="password" placeholder="Mật khẩu mới"
                    value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <input type="password" placeholder="Xác nhận mật khẩu mới"
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">Cập nhật</button>
                    <button type="button" className="btn-secondary"
                      onClick={() => setShowChangePassword(false)}>Hủy</button>
                  </div>
                </form>
                {message && <p className="message">{message}</p>}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
