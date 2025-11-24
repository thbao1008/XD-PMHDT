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
  FiBook,
  FiPlay,
  FiRefreshCw
} from "react-icons/fi";
import { FaRobot } from "react-icons/fa";
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
  const [aiProgress, setAiProgress] = useState({
    trainingSamples: 0,
    aiReports: 0,
    accuracy: null,
    status: 'initializing'
  });
  const [aiActivities, setAiActivities] = useState([]);
  const [initializingAI, setInitializingAI] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

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
    loadAIProgress();
    loadAIActivities();
    
    // Auto-refresh AI progress mỗi 10 giây
    const interval = setInterval(() => {
      loadAIProgress();
      loadAIActivities();
    }, 10000);
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const loadAIProgress = async () => {
    if (!mentorId) return;
    setLoadingAI(true);
    try {
      const res = await api.get(`/mentors/${mentorId}/ai/progress`);
      if (res.data?.progress) {
        setAiProgress(res.data.progress);
      }
    } catch (err) {
      console.error("Error loading AI progress:", err);
    } finally {
      setLoadingAI(false);
    }
  };

  const loadAIActivities = async () => {
    if (!mentorId) return;
    try {
      const res = await api.get(`/mentors/${mentorId}/ai/activities?limit=10`);
      setAiActivities(res.data.activities || []);
    } catch (err) {
      console.error("Error loading AI activities:", err);
    }
  };

  const handleInitializeAI = async () => {
    if (!mentorId) return;
    setInitializingAI(true);
    try {
      const res = await api.post(`/mentors/${mentorId}/ai/initialize`);
      if (res.data.success) {
        alert(res.data.message || "Đã khởi tạo AI learning thành công!");
        // Reload AI progress và activities
        await loadAIProgress();
        await loadAIActivities();
      }
    } catch (err) {
      console.error("Error initializing AI:", err);
      alert("Lỗi khi khởi tạo AI learning: " + (err.response?.data?.message || err.message));
    } finally {
      setInitializingAI(false);
    }
  };

  const getAIStatusColor = (status) => {
    switch (status) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'training': return '#f59e0b';
      case 'initializing': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getAIStatusText = (status) => {
    switch (status) {
      case 'excellent': return 'Xuất sắc';
      case 'good': return 'Tốt';
      case 'training': return 'Đang học';
      case 'initializing': return 'Chưa khởi tạo';
      default: return 'Chưa khởi tạo';
    }
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

        {/* Right Column: Pending Submissions & AI Progress */}
        <div className="dashboard-right-column">
          {/* AI Progress Section */}
          <div className="dashboard-section ai-section" style={{ marginBottom: "20px" }}>
            <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>
                <FaRobot style={{ marginRight: "8px" }} />
                Tiến trình AI & Công suất
              </h2>
              <button
                onClick={handleInitializeAI}
                disabled={initializingAI}
                style={{
                  padding: "8px 16px",
                  background: initializingAI ? "#9ca3af" : "#10b981",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: initializingAI ? "not-allowed" : "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                {initializingAI ? (
                  <>
                    <FiRefreshCw style={{ animation: "spin 1s linear infinite" }} />
                    Đang khởi tạo...
                  </>
                ) : (
                  <>
                    <FiPlay />
                    Khởi tạo
                  </>
                )}
              </button>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
              <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Training Samples</div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: "#1f2937" }}>
                  {aiProgress.trainingSamples.toLocaleString()}
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>Mẫu đã huấn luyện</div>
              </div>
              
              <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>AI Reports</div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: "#1f2937" }}>
                  {aiProgress.aiReports.toLocaleString()}
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>Báo cáo đã tạo</div>
              </div>
              
              <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Công suất</div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: getAIStatusColor(aiProgress.status) }}>
                  {aiProgress.trainingSamples > 0 && aiProgress.aiReports > 0 
                    ? ((aiProgress.aiReports / aiProgress.trainingSamples) * 100).toFixed(1)
                    : '0'}%
                </div>
                <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>Tỷ lệ sử dụng</div>
              </div>
              
              <div style={{ padding: "16px", background: "#f9fafb", borderRadius: "8px" }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Trạng thái</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: getAIStatusColor(aiProgress.status) }}>
                  {getAIStatusText(aiProgress.status)}
                </div>
                {aiProgress.accuracy !== null && (
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>
                    Độ chính xác: {(aiProgress.accuracy * 100).toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
            
            {/* AI Activities */}
            {aiActivities.length > 0 && (
              <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px", fontWeight: "500" }}>
                  Hoạt động gần đây
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {aiActivities.slice(0, 5).map((activity, idx) => (
                    <div key={idx} style={{ 
                      padding: "8px 12px", 
                      background: "#f9fafb", 
                      borderRadius: "6px",
                      marginBottom: "8px",
                      fontSize: "12px"
                    }}>
                      <div style={{ color: "#1f2937", marginBottom: "4px" }}>{activity.title}</div>
                      <div style={{ color: "#9ca3af", fontSize: "11px" }}>
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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

