import React, { useEffect, useState } from "react";
import api from "../../api.js";
import Modal from "../common/Modal.jsx";
import AssignedLearnersModal from "../common/AssignedLearnersModal.jsx";
import { getAuth } from "../../utils/auth.js"; // giả sử bạn có hàm này

export default function UserForPage({ userId, onClose, onStatusChange }) {
  const [user, setUser] = useState(null);
  const [latestPurchase, setLatestPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssigned, setShowAssigned] = useState(false);
  const [showMentorInfo, setShowMentorInfo] = useState(false);

  const auth = getAuth();
  const isAdmin = auth?.user?.role?.toUpperCase() === "ADMIN";

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get(`/admin/users/${userId}`);
        const u = res.data.user || res.data;
        setUser(u);

        if (u.role?.toUpperCase() === "LEARNER") {
          const learnerId = u.learner_id;
          if (learnerId) {
            const purchaseRes = await api.get(`/learners/${learnerId}/latest-purchase`);
            setLatestPurchase(purchaseRes.data.purchase || null);
          }
        }
      } catch (err) {
        if (err.response?.status === 403) {
          try {
            const res = await api.get(`/mentors/${userId}`);
            const u = res.data.mentor || res.data;
            setUser(u);
          } catch (e2) {
            console.error("❌ Fallback load mentor error:", e2);
          }
        } else {
          console.error("❌ Lỗi load user:", err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  const toggleBan = async () => {
    try {
      const newStatus = user.status === "active" ? "banned" : "active";
      const res = await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      if (res.data?.user) {
        const updated = res.data.user;
        setUser(updated);
        if (onStatusChange) onStatusChange(updated);
      }
    } catch (err) {
      console.error("❌ Lỗi đổi trạng thái:", err);
    }
  };

  if (loading) return <p>Đang tải...</p>;
  if (!user) return <p>Không tìm thấy người dùng.</p>;

  const isMentor = user.role?.toUpperCase() === "MENTOR";

  return (
    <Modal title="Thông tin người dùng" onClose={onClose}>
      <div style={{ display: "flex", gap: 16, position: "relative" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "grid", rowGap: "6px", marginBottom: "12px" }}>
            <div><strong>Tên:</strong> {user.name}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>SĐT:</strong> {user.phone || "-"}</div>
            <div><strong>Ngày sinh:</strong> {user.dob ? new Date(user.dob).toLocaleDateString("vi-VN") : "-"}</div>
            {!isMentor && <div><strong>Vai trò:</strong> {user.role}</div>}
          </div>

          {user.role?.toUpperCase() === "LEARNER" && (
            <>
              <div style={{ marginTop: "1rem" }}>
                <h4>Gói học đã đăng ký</h4>
                {latestPurchase ? (
                  <>
                    <p>
                      <strong>Tên gói:</strong> {latestPurchase.package_name || "Không rõ"}{" "}
                      <span style={{ color: user.status === "banned" ? "#fd7e14" : latestPurchase.status === "active" ? "green" : "gray" }}>
                        {user.status === "banned"
                          ? "Tạm ngưng"
                          : latestPurchase.status === "active"
                          ? "Còn hạn"
                          : "Hết hạn"}
                      </span>
                      <br />
                      {latestPurchase.created_at && (
                        <small>
                          Ngày mua: {new Date(latestPurchase.created_at).toLocaleDateString("vi-VN")}
                        </small>
                      )}
                      {latestPurchase.expiry_date && (
                        <small>
                          {" "}– Hết hạn: {new Date(latestPurchase.expiry_date).toLocaleDateString("vi-VN")}
                        </small>
                      )}
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => window.location.href = `/admin/learners/${user.learner_id}/purchases`}
                    >
                      Xem chi tiết gói học
                    </button>
                  </>
                ) : (
                  <p className="muted">Chưa có gói học nào</p>
                )}
              </div>

              <div style={{ marginTop: "1rem" }}>
                <h4>Được hướng dẫn bởi giảng viên</h4>
                {user.mentor_name ? (
                  <p>
                    <span
                      style={{ color: "blue", cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => setShowMentorInfo(true)}
                    >
                      {user.mentor_name}
                    </span>
                  </p>
                ) : (
                  <p className="muted">Chưa được gán giảng viên</p>
                )}
              </div>
            </>
          )}

          {isMentor && isAdmin && (
            <div style={{ marginTop: "1rem" }}>
              <button className="btn btn-secondary" onClick={() => setShowAssigned(true)}>
                Danh sách học viên được bổ nhiệm
              </button>
            </div>
          )}
        </div>

        <div style={{ width: 120 }}>
          <img
            src={user.avatarUrl || "/default-avatar.png"}
            alt="Avatar"
            style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", background: "#eee" }}
          />
        </div>

        {isAdmin && !isMentor && (
          <button
            onClick={toggleBan}
            style={{
              position: "absolute",
              bottom: "16px",
              right: "16px",
              backgroundColor: "#dc3545",
              border: "none",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            {user.status === "active" ? "Ban user" : "Unban user"}
          </button>
        )}
      </div>

      {showAssigned && (
        <AssignedLearnersModal mentorId={user.id} onClose={() => setShowAssigned(false)} />
      )}

      {showMentorInfo && (
        <UserForPage
          userId={user.mentor_user_id ?? user.mentor_id}
          onClose={() => setShowMentorInfo(false)}
        />
      )}
    </Modal>
  );
}
