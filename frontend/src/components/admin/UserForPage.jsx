import React, { useEffect, useState } from "react";
import api from "../../api.js";
import Modal from "../common/Modal.jsx";
import AssignedLearnersModal from "../common/AssignedLearnersModal.jsx";
import { getAuth } from "../../utils/auth.js";
import "../../styles/user-for-page.css";

export default function UserForPage({ userId, onClose, onStatusChange }) {
  const [user, setUser] = useState(null);
  const [latestPurchase, setLatestPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAssigned, setShowAssigned] = useState(false);
  const [showMentorInfo, setShowMentorInfo] = useState(false);
  const [learnerTotalRating, setLearnerTotalRating] = useState(null);
  const [mentorBio, setMentorBio] = useState("");

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
            
            // Load total rating (average from practice + challenges)
            try {
              const ratingRes = await api.get(`/learners/${learnerId}/progress-analytics`);
              if (ratingRes.data?.overall?.average_score) {
                setLearnerTotalRating(ratingRes.data.overall.average_score);
              }
            } catch (err) {
              // Use rating from user object if available
              if (u.learner_average_score) {
                setLearnerTotalRating(u.learner_average_score);
              }
            }
          }
        }
        
        // Load bio for mentor
        if (u.role?.toUpperCase() === "MENTOR") {
          try {
            const mentorRes = await api.get(`/mentors/by-user/${userId}`);
            const mentorData = mentorRes.data;
            if (mentorData?.bio) {
              setMentorBio(mentorData.bio);
            }
          } catch (err) {
            console.error("Error loading mentor bio:", err);
          }
        }
      } catch (err) {
        if (err.response?.status === 403 || err.response?.status === 404) {
          try {
            // Try to get mentor by userId
            const res = await api.get(`/mentors/by-user/${userId}`);
            const mentor = res.data.mentor || res.data;
            if (mentor) {
              setUser({
                ...mentor,
                role: "MENTOR",
                user_id: mentor.user_id || userId,
                id: mentor.user_id || userId,
                name: mentor.name,
                email: mentor.email,
                phone: mentor.phone,
                dob: mentor.dob,
                status: mentor.status,
                mentor_rating: mentor.rating
              });
              if (mentor.bio) {
                setMentorBio(mentor.bio);
              }
            }
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
    <Modal title="Thông tin người dùng" onClose={onClose} className="user-for-page-modal">
      <div className="user-for-page-content">
        <div className="user-for-page-main">
          <div className="user-for-page-info">
            <div className="user-for-page-info-item">
              <span className="user-for-page-info-label">Tên:</span>
              <span className="user-for-page-info-value">{user.name}</span>
            </div>
            <div className="user-for-page-info-item">
              <span className="user-for-page-info-label">Email:</span>
              <span className="user-for-page-info-value">{user.email}</span>
            </div>
            <div className="user-for-page-info-item">
              <span className="user-for-page-info-label">SĐT:</span>
              <span className="user-for-page-info-value">{user.phone || "-"}</span>
            </div>
            <div className="user-for-page-info-item">
              <span className="user-for-page-info-label">Ngày sinh:</span>
              <span className="user-for-page-info-value">
                {user.dob ? new Date(user.dob).toLocaleDateString("vi-VN") : "-"}
              </span>
            </div>
            {!isMentor && (
              <div className="user-for-page-info-item">
                <span className="user-for-page-info-label">Vai trò:</span>
                <span className="user-for-page-info-value">{user.role}</span>
              </div>
            )}
            {isMentor && (
              <div className="user-for-page-info-item user-for-page-bio">
                <span className="user-for-page-info-label">Giới thiệu:</span>
                {mentorBio ? (
                  <span className="user-for-page-info-value user-for-page-bio-text">{mentorBio}</span>
                ) : (
                  <span className="user-for-page-info-value user-for-page-bio-empty">Chưa được cập nhật</span>
                )}
              </div>
            )}
          </div>

          {/* Rating Section */}
          {user.role?.toUpperCase() === "LEARNER" && learnerTotalRating !== null && (
            <div className="user-for-page-section">
              <h4>Điểm đánh giá tổng</h4>
              <div className="user-for-page-rating-box">
                <div className="user-for-page-rating-value">
                  {parseFloat(learnerTotalRating).toFixed(1)}/100
                </div>
                <div className="user-for-page-rating-label">
                  Điểm trung bình từ luyện nói và challenge
                </div>
              </div>
            </div>
          )}
          
          {user.role?.toUpperCase() === "MENTOR" && user.mentor_rating !== null && user.mentor_rating !== undefined && (
            <div className="user-for-page-section">
              <h4>Điểm đánh giá</h4>
              <div className="user-for-page-rating-box">
                <div className="user-for-page-rating-value">
                  {parseFloat(user.mentor_rating).toFixed(1)}/10
                </div>
                <div className="user-for-page-rating-label">
                  Điểm đánh giá từ học viên
                </div>
              </div>
            </div>
          )}

          {user.role?.toUpperCase() === "LEARNER" && (
            <>
              <div className="user-for-page-section">
                <h4>Gói học đã đăng ký</h4>
                {latestPurchase ? (
                  <>
                    <div className="user-for-page-package-info">
                      <p>
                        <strong>Tên gói:</strong> {latestPurchase.package_name || "Không rõ"}{" "}
                        <span className={`user-for-page-package-status ${
                          user.status === "banned" 
                            ? "paused" 
                            : latestPurchase.status === "active" 
                            ? "active" 
                            : "expired"
                        }`}>
                          {user.status === "banned"
                            ? "Tạm ngưng"
                            : latestPurchase.status === "active"
                            ? "Còn hạn"
                            : "Hết hạn"}
                        </span>
                      </p>
                      {latestPurchase.created_at && (
                        <span className="user-for-page-small">
                          Ngày mua: {new Date(latestPurchase.created_at).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                      {latestPurchase.expiry_date && (
                        <span className="user-for-page-small">
                          {" "}– Hết hạn: {new Date(latestPurchase.expiry_date).toLocaleDateString("vi-VN")}
                        </span>
                      )}
                    </div>
                    <button
                      className="user-for-page-btn user-for-page-btn-primary"
                      onClick={() => window.location.href = `/admin/learners/${user.learner_id}/purchases`}
                    >
                      Xem chi tiết gói học
                    </button>
                  </>
                ) : (
                  <p className="user-for-page-muted">Chưa có gói học nào</p>
                )}
              </div>

              <div className="user-for-page-section">
                <h4>Được hướng dẫn bởi giảng viên</h4>
                {user.mentor_name ? (
                  <p>
                    <span
                      className="user-for-page-mentor-link"
                      onClick={() => setShowMentorInfo(true)}
                    >
                      {user.mentor_name}
                    </span>
                  </p>
                ) : (
                  <p className="user-for-page-muted">Chưa được gán giảng viên</p>
                )}
                {isAdmin && user.mentor_name && (
                  <button
                    className="user-for-page-btn user-for-page-btn-secondary"
                    onClick={async () => {
                      if (!user.learner_id) return;
                      if (!window.confirm("Bạn có chắc chắn muốn đổi mentor? Mentor cũ sẽ được thêm vào danh sách blocklist và hệ thống sẽ tự động gán mentor mới.")) {
                        return;
                      }
                      try {
                        const res = await api.post("/admin/users/learners/change-mentor", {
                          learnerId: user.learner_id,
                        });
                        if (res.data.success) {
                          alert(res.data.message);
                          // Refresh user data
                          const userRes = await api.get(`/admin/users/${userId}`);
                          const u = userRes.data.user || userRes.data;
                          setUser(u);
                          if (onStatusChange) onStatusChange();
                        }
                      } catch (err) {
                        console.error("Lỗi đổi mentor:", err);
                        alert("Có lỗi xảy ra khi đổi mentor");
                      }
                    }}
                    style={{ marginTop: "8px", width: "100%" }}
                  >
                    Đổi mentor
                  </button>
                )}
              </div>

              <div className="user-for-page-section">
                <button
                  className="user-for-page-btn user-for-page-btn-primary"
                  onClick={() => {
                    if (user.learner_id) {
                      // Mở ReportsPage với filter learnerId
                      window.location.href = `/admin/reports?learnerId=${user.learner_id}`;
                    }
                  }}
                  style={{ width: "100%" }}
                >
                  Xem tiến độ học tập
                </button>
              </div>
            </>
          )}

          {isMentor && isAdmin && (
            <div className="user-for-page-actions">
              <button 
                className="user-for-page-btn user-for-page-btn-secondary" 
                onClick={() => setShowAssigned(true)}
              >
                Danh sách học viên được bổ nhiệm
              </button>
            </div>
          )}
        </div>

        <div className="user-for-page-avatar-section">
          <div className="user-for-page-avatar">
            <img
              src={user.avatar_url || user.avatarUrl || user.avatar || "/default-avatar.png"}
              alt="Avatar"
              onError={(e) => {
                e.target.src = "/default-avatar.png";
              }}
            />
          </div>
          
          {isAdmin && (
            <button
              onClick={toggleBan}
              className="user-for-page-btn user-for-page-btn-danger"
              style={{ marginTop: "16px", width: "100%" }}
            >
              {user.status === "active" ? "Ban user" : "Unban user"}
            </button>
          )}
        </div>
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
