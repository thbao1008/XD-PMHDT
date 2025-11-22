// frontend/src/components/mentor/MentorDashboard.jsx
import React, { useState, useEffect } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import Calendar from "../common/Calendar";
import { 
  FiUsers, 
  FiTarget, 
  FiStar, 
  FiAlertCircle,
  FiCheckCircle,
  FiBook
} from "react-icons/fi";
import "../../styles/mentor-dashboard.css";

export default function MentorDashboard() {
  const auth = getAuth();
  const userId = auth?.user?.id ?? auth?.user?._id ?? auth?.user?.user_id ?? null;
  const [mentorId, setMentorId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalChallenges: 0,
    pendingSubmissions: 0,
    rating: 0,
    totalLessons: 0
  });
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function loadMentorId() {
      try {
        const res = await api.get(`/mentors/by-user/${userId}`);
        const mid = res.data?.mentor_id || res.data?.id;
        setMentorId(mid);
      } catch (err) {
        console.error("Error loading mentor ID:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMentorId();
  }, [userId]);

  useEffect(() => {
    if (!mentorId) return;

    loadDashboardData();
    loadPendingSubmissions();
  }, [mentorId]);

  const loadDashboardData = async () => {
    try {
      const res = await api.get(`/mentors/${mentorId}/dashboard/stats`);
      setStats(res.data.stats || stats);
    } catch (err) {
      console.error("Error loading dashboard stats:", err);
    }
  };

  const loadPendingSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await api.get(`/mentors/${mentorId}/dashboard/pending-submissions?limit=5`);
      setPendingSubmissions(res.data.submissions || []);
    } catch (err) {
      console.error("Error loading pending submissions:", err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="mentor-dashboard">
        <div className="loading-state">Đang tải...</div>
      </div>
    );
  }

  if (!mentorId) {
    return (
      <div className="mentor-dashboard">
        <div className="error-state">Không tìm thấy thông tin mentor</div>
      </div>
    );
  }

  return (
    <div className="mentor-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Xem thống kê và quản lý học viên của bạn</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#3b82f6" }}>
            <FiUsers size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalLearners}</div>
            <div className="stat-label">Học viên</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#10b981" }}>
            <FiTarget size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalChallenges}</div>
            <div className="stat-label">Challenges</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#f59e0b" }}>
            <FiStar size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.rating.toFixed(1)}</div>
            <div className="stat-label">Đánh giá</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: "#8b5cf6" }}>
            <FiBook size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalLessons}</div>
            <div className="stat-label">Bài giảng</div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Calendar */}
        <div className="dashboard-left-column">
          <div className="dashboard-section calendar-section">
            <Calendar mentorId={mentorId} />
          </div>
        </div>

        {/* Right Column: Pending Submissions */}
        <div className="dashboard-right-column">
          <div className="dashboard-section submissions-section">
            <div className="section-header">
              <h2>
                <FiAlertCircle /> Bài cần chấm
              </h2>
              {stats.pendingSubmissions > 0 && (
                <span className="badge badge-danger">{stats.pendingSubmissions}</span>
              )}
            </div>
            {loadingSubmissions ? (
              <div className="loading-state">Đang tải...</div>
            ) : pendingSubmissions.length === 0 ? (
              <div className="empty-state">
                <FiCheckCircle style={{ fontSize: 48, color: "#10b981", marginBottom: 16 }} />
                <p>Không có bài nào cần chấm</p>
              </div>
            ) : (
              <div className="submissions-list">
                {pendingSubmissions.map((submission) => (
                  <div key={submission.id} className="submission-item">
                    <div className="submission-header">
                      <h4>{submission.title || `Challenge #${submission.challenge_id}`}</h4>
                      <span className="submission-date">
                        {formatDate(submission.created_at)}
                      </span>
                    </div>
                    <div className="submission-learner">
                      <FiUsers size={16} /> {submission.learner_name || "N/A"}
                    </div>
                    {submission.level && (
                      <div className="submission-level" style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                        Level: {submission.level}
                      </div>
                    )}
                    <a
                      href={`/mentor/assessment?submissionId=${submission.id}`}
                      className="btn-review"
                    >
                      Xem và chấm bài
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
