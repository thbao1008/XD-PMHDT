import React, { useEffect, useState } from "react";
import api from "../../api";
import Modal from "../common/Modal.jsx";
import AssignedLearnersModal from "../common/AssignedLearnersModal.jsx";

export default function UserForPage({ userId, onClose, onStatusChange }) {
  const [user, setUser] = useState(null);
  const [latestPurchase, setLatestPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssigned, setShowAssigned] = useState(false);
  const [showMentorInfo, setShowMentorInfo] = useState(false); 
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
        console.error("❌ Lỗi load user:", err);
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
  if (!user) return <p>Không tìm thấy user.</p>;

  return (
    <Modal title="Thông tin người dùng" onClose={onClose}>
      <div style={{ display: "flex", gap: 16, position: "relative" }}>
        <div style={{ flex: 1 }}>
          <p><strong>Tên:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>SĐT:</strong> {user.phone || "-"}</p>
          <p><strong>Ngày sinh:</strong> {user.dob ? new Date(user.dob).toLocaleDateString("vi-VN") : "-"}</p>
          <p><strong>Vai trò:</strong> {user.role}</p>

          {/* Nếu là LEARNER thì hiển thị gói học + giảng viên */}
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

              {/* Giảng viên hướng dẫn */}
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

          {user.role?.toUpperCase() === "MENTOR" && (
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

        {/* Nút Ban/Unban cố định góc dưới phải */}
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
      </div>

      {showAssigned && (
        <AssignedLearnersModal mentorId={user.id} onClose={() => setShowAssigned(false)} />
      )}

      {/* Modal hiển thị thông tin giảng viên */}
      {showMentorInfo && (
        <UserForPage
          userId={user.mentor_id}
          onClose={() => setShowMentorInfo(false)}
        />
      )}
    </Modal>
  );
}
