import React, { useEffect, useState } from "react";
import api from "../../api.js";
import { FaCommentDots, FaSearch } from "react-icons/fa";
import "../../styles/reportpage.css";
import UserForPage from "../admin/UserForPage.jsx";
import ProgressAnalytics from "../learner/ProgressAnalytics.jsx";

export default function ReportsPage() {
  const [filters, setFilters] = useState({ from: "", to: "", status: "pending" });
  const [summary, setSummary] = useState({ total_reports: 0 });
  const [feedbacks, setFeedbacks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  
  // State cho learners progress
  const [learnersProgress, setLearnersProgress] = useState([]);
  const [loadingLearners, setLoadingLearners] = useState(true);
  const [selectedLearnerId, setSelectedLearnerId] = useState(null);
  const [selectedLearnerAnalytics, setSelectedLearnerAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // State cho filter và search
  const [mentorFilter, setMentorFilter] = useState("");
  const [learnerSearch, setLearnerSearch] = useState("");
  const [mentors, setMentors] = useState([]);

  // State cho modal reply
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  
  // State cho modal phóng to hình ảnh/video
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState({ type: null, url: null });

  // Load summary (chỉ để lọc theo thời gian)
  const fetchSummary = async () => {
    try {
      const params = {};
      if (filters.from && filters.to) {
        params.from = filters.from;
        params.to = filters.to;
      }
      const res = await api.get("/admin/reports/summary", { params });
      setSummary(res.data.summary || { total_reports: 0 });
    } catch (err) {
      console.error("❌ Lỗi load summary:", err);
    }
  };

  // Load reports
  const fetchReports = async (status) => {
    try {
      const params = {};
      if (status) params.status = status;
      else if (filters.status) params.status = filters.status;
      const fb = await api.get("/admin/reports", { params });
      setFeedbacks(fb.data.reports || []);
    } catch (err) {
      console.error("❌ Lỗi load reports:", err);
    }
  };

  // Load learner progress
  const fetchProgress = async () => {
    try {
      if (!searchQuery) return;
      const pr = await api.get("/admin/reports/learner-progress", { params: { query: searchQuery } });
      setProgress(pr.data.learners || []);
    } catch (err) {
      console.error("❌ Lỗi load progress:", err);
    }
  };

  // Change report status
  const changeStatus = async (reportId, newStatus, customReply = null) => {
    try {
      // Nội dung mặc định theo status
      let defaultReply = "";
      if (newStatus === "dismissed") {
        defaultReply = "Phản hồi bị từ chối vì chưa đủ căn cứ.";
      } else if (newStatus === "resolved") {
        defaultReply = "Phản hồi được chấp nhận đang tiến hành xử lý";
      }
      
      const finalReply = customReply !== null ? customReply : defaultReply;
      
      const res = await api.patch(`/admin/reports/${reportId}/status`, {
        status: newStatus,
        replyContent: finalReply,
        actorRole: "admin"
      });
      console.log("✅ Report updated:", res.data.report);

      // cập nhật lại state FE
      setFeedbacks(prev =>
        prev.map(r => r.report_id === reportId ? res.data.report : r)
      );
      
      setShowReplyModal(false);
      setSelectedReport(null);
      setReplyContent("");
    } catch (err) {
      console.error("❌ Lỗi cập nhật trạng thái:", err);
    }
  };

  const openReplyModal = (report, newStatus = null) => {
    setSelectedReport(report);
    const status = newStatus || report.status;
    
    // Set nội dung mặc định theo status
    if (status === "dismissed") {
      setReplyContent("Phản hồi bị từ chối vì chưa đủ căn cứ.");
    } else if (status === "resolved") {
      setReplyContent("Phản hồi được chấp nhận đang tiến hành xử lý");
    } else if (report.reply) {
      // Nếu đã có reply, hiển thị để chỉnh sửa (bỏ phần timestamp)
      setReplyContent(report.reply.replace(/^\[Admin.*?\]\s*/, ""));
    } else {
      setReplyContent("");
    }
    setShowReplyModal(true);
  };

  // Load mentors
  const fetchMentors = async () => {
    try {
      const res = await api.get("/admin/reports/mentors");
      setMentors(res.data.mentors || []);
    } catch (err) {
      console.error("❌ Lỗi load mentors:", err);
    }
  };

  // Load learners progress với filter và search
  const fetchLearnersProgress = async () => {
    try {
      setLoadingLearners(true);
      const params = {};
      if (mentorFilter) params.mentor_id = mentorFilter;
      if (learnerSearch.trim()) params.search = learnerSearch.trim();
      
      const res = await api.get("/admin/reports/learners-progress", { params });
      setLearnersProgress(res.data.learners || []);
    } catch (err) {
      console.error("❌ Lỗi load learners progress:", err);
    } finally {
      setLoadingLearners(false);
    }
  };

  // Load analytics cho learner được chọn
  const fetchLearnerAnalytics = async (learnerId) => {
    try {
      setLoadingAnalytics(true);
      const res = await api.get(`/learners/${learnerId}/progress-analytics`);
      setSelectedLearnerAnalytics(res.data);
    } catch (err) {
      console.error("❌ Lỗi load analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleLearnerClick = (learnerId) => {
    setSelectedLearnerId(learnerId);
    fetchLearnerAnalytics(learnerId);
  };

  useEffect(() => {
    fetchSummary();
    fetchReports(filters.status);
    fetchMentors();
  }, []);

  // Load learners progress khi component mount và khi filter/search thay đổi
  useEffect(() => {
    fetchLearnersProgress();
  }, [mentorFilter, learnerSearch]);

  // Check URL params sau khi learners đã load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const learnerIdParam = urlParams.get('learnerId');
    if (learnerIdParam && learnersProgress.length > 0) {
      const learner = learnersProgress.find(l => String(l.learner_id) === String(learnerIdParam));
      if (learner && !selectedLearnerId) {
        handleLearnerClick(learner.learner_id);
        // Clean URL
        window.history.replaceState({}, '', '/admin/reports');
      }
    }
  }, [learnersProgress]);

  // Hàm mở modal phóng to hình ảnh/video
  const openMediaModal = (type, url) => {
    const fullUrl = url.startsWith("/uploads/") ? `http://localhost:4002${url}` : url;
    setSelectedMedia({ type, url: fullUrl });
    setShowMediaModal(true);
  };

  return (
    <div className="report-page">
      <h1>Báo cáo học viên, giảng viên & feedback</h1>

      {/* Phản hồi & tố cáo - Đưa lên trước */}
      <section>
        <h2>Phản hồi & Tố cáo</h2>
        
        {/* Bộ lọc thời gian - Di chuyển vào trong section */}
        <div className="filters" style={{ marginBottom: "20px" }}>
          <label>Từ ngày:
            <input
              type="date"
              value={filters.from}
              onChange={e => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label>Đến ngày:
            <input
              type="date"
              value={filters.to}
              onChange={e => {
                const newFilters = { ...filters, to: e.target.value };
                setFilters(newFilters);
                if (newFilters.from && newFilters.to) {
                  fetchSummary();
                }
              }}
            />
          </label>
        </div>
        
        {/* Cards tổng quan - gộp vào section Phản hồi & Tố cáo */}
        <div className="summary-cards" style={{ display: "flex", gap: "20px", margin: "20px 0" }}>
          <div className="card"><FaCommentDots size={30} color="orange" /><p>Tố cáo (theo thời gian)</p><h3>{summary.total_reports}</h3></div>
        </div>
        
        <div className="filters">
          <select
            name="status-select"
            value={filters.status}
            onChange={e => {
              const newStatus = e.target.value;
              setFilters({ ...filters, status: newStatus });
              fetchReports(newStatus);
            }}
          >
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Nội dung</th>
              <th>Trạng thái</th>
              <th>Ngày gửi</th>
              <th>Phản hồi admin</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map(f => (
              <tr key={f.report_id}>
                <td className="sender-target">
                  <strong>Reporter:</strong>{" "}
                  <span className="clickable" onClick={() => setSelectedUserId(f.reporter_id)}>
                    {f.reporter_name} - {f.reporter_role}
                  </span>
                  <br />
                  <strong>Target:</strong>{" "}
                  <span className="clickable" onClick={() => setSelectedUserId(f.target_id)}>
                    {f.target_name} - {f.target_role}
                  </span>
                </td>

                <td style={{ whiteSpace: "pre-line" }}>
                  <div>{f.content}</div>
                  {f.image_url && (
                    <div style={{ marginTop: 8 }}>
                      <img 
                        src={f.image_url.startsWith("/uploads/") ? `http://localhost:4002${f.image_url}` : f.image_url}
                        alt="Report image"
                        onClick={() => openMediaModal("image", f.image_url)}
                        style={{ 
                          maxWidth: "200px", 
                          maxHeight: "200px", 
                          borderRadius: 4,
                          cursor: "pointer",
                          transition: "transform 0.2s",
                          objectFit: "cover"
                        }}
                        onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                      />
                    </div>
                  )}
                  {f.video_url && (
                    <div style={{ marginTop: 8 }}>
                      <video 
                        src={f.video_url.startsWith("/uploads/") ? `http://localhost:4002${f.video_url}` : f.video_url}
                        controls
                        onClick={() => openMediaModal("video", f.video_url)}
                        style={{ 
                          maxWidth: "300px", 
                          maxHeight: "200px", 
                          borderRadius: 4,
                          cursor: "pointer",
                          transition: "transform 0.2s"
                        }}
                        onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                        onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                      />
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexDirection: "column" }}>
                    <select
                      value={f.status}
                      onChange={e => {
                        const newStatus = e.target.value;
                        if (newStatus !== f.status) {
                          openReplyModal(f, newStatus);
                        }
                      }}
                      style={{ padding: "4px", borderRadius: "4px", width: "100%" }}
                    >
                      <option value="pending">Pending</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                    {f.status !== "pending" && (
                      <button
                        className="btn-ghost"
                        onClick={() => openReplyModal(f)}
                        style={{ fontSize: 12, padding: "4px 8px", width: "100%" }}
                      >
                        Xem/Sửa phản hồi
                      </button>
                    )}
                  </div>
                </td>
                <td>{new Date(f.created_at).toLocaleString("vi-VN")}</td>
                <td style={{ whiteSpace: "pre-line" }}>
                  {f.reply ? (
                    <div>{f.reply}</div>
                  ) : (
                    <span className="placeholder">Chưa có phản hồi</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Tiến độ đào tạo - Danh sách learners với progress - Đưa xuống dưới */}
      <section>
        <h2>Tiến độ đào tạo</h2>
        
        {/* Bộ lọc và tìm kiếm */}
        <div className="filters" style={{ marginBottom: "20px", display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>Lọc theo giảng viên:</span>
            <select
              value={mentorFilter}
              onChange={(e) => setMentorFilter(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ddd", minWidth: "200px" }}
            >
              <option value="">Tất cả giảng viên</option>
              {mentors.map(mentor => (
                <option key={mentor.mentor_id} value={mentor.mentor_id}>
                  {mentor.mentor_name}
                </option>
              ))}
            </select>
          </label>
          
          <label style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "250px" }}>
            <FaSearch />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc số điện thoại học viên..."
              value={learnerSearch}
              onChange={(e) => setLearnerSearch(e.target.value)}
              style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #ddd", flex: 1 }}
            />
          </label>
        </div>
        
        {loadingLearners ? (
          <div>Đang tải...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Học viên</th>
                <th>Giảng viên hỗ trợ</th>
                <th>Tổng điểm trung bình</th>
                <th>Số lần luyện nói</th>
                <th>Số lần làm challenge</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {learnersProgress.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center" }}>Chưa có dữ liệu</td>
                </tr>
              ) : (
                learnersProgress.map(learner => (
                  <tr key={learner.learner_id}>
                    <td>
                      <span
                        className="clickable-learner-name"
                        onClick={() => setSelectedUserId(learner.user_id)}
                        style={{ 
                          color: "#3b82f6", 
                          cursor: "pointer", 
                          textDecoration: "underline",
                          fontWeight: 500
                        }}
                      >
                        {learner.learner_name || "N/A"}
                      </span>
                    </td>
                    <td>
                      {learner.mentor_name ? (
                        <span
                          className="clickable-learner-name"
                          onClick={() => learner.mentor_user_id && setSelectedUserId(learner.mentor_user_id)}
                          style={{ 
                            color: "#3b82f6", 
                            cursor: learner.mentor_user_id ? "pointer" : "default", 
                            textDecoration: learner.mentor_user_id ? "underline" : "none",
                            fontWeight: 500
                          }}
                        >
                          {learner.mentor_name}
                        </span>
                      ) : (
                        "Chưa gán"
                      )}
                    </td>
                    <td>{parseFloat(learner.average_score || 0).toFixed(1)}/100</td>
                    <td>{learner.practice_attempts || 0}</td>
                    <td>{learner.challenge_attempts || 0}</td>
                    <td>
                      <button 
                        className="btn-ghost"
                        onClick={() => handleLearnerClick(learner.learner_id)}
                        style={{ padding: "4px 8px", fontSize: 12 }}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>

      {/* Modal hiển thị thông tin user qua UserForPage */}
      {selectedUserId && (
        <UserForPage
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}

      {/* Modal Reply/Note cho Admin */}
      {showReplyModal && selectedReport && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 8,
            padding: 24,
            maxWidth: 600,
            width: "90%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h3 style={{ marginTop: 0 }}>
              Phản hồi cho Report #{selectedReport.report_id}
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Trạng thái:</strong> {selectedReport.status}
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <strong>Nội dung report:</strong>
              <div style={{ padding: 12, background: "#f9fafb", borderRadius: 6, marginTop: 8, whiteSpace: "pre-line" }}>
                {selectedReport.content}
              </div>
            </div>

            {selectedReport.image_url && (
              <div style={{ marginBottom: 16 }}>
                <strong>Hình ảnh:</strong>
                <div style={{ marginTop: 8 }}>
                  <img 
                    src={selectedReport.image_url.startsWith("/uploads/") ? `http://localhost:4002${selectedReport.image_url}` : selectedReport.image_url}
                    alt="Report"
                    onClick={() => openMediaModal("image", selectedReport.image_url)}
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "300px", 
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "transform 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.transform = "scale(1.02)"}
                    onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                  />
                </div>
              </div>
            )}

            {selectedReport.video_url && (
              <div style={{ marginBottom: 16 }}>
                <strong>Video:</strong>
                <div style={{ marginTop: 8 }}>
                  <video 
                    src={selectedReport.video_url.startsWith("/uploads/") ? `http://localhost:4002${selectedReport.video_url}` : selectedReport.video_url}
                    controls
                    onClick={() => openMediaModal("video", selectedReport.video_url)}
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "300px", 
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "transform 0.2s"
                    }}
                    onMouseEnter={(e) => e.target.style.transform = "scale(1.02)"}
                    onMouseLeave={(e) => e.target.style.transform = "scale(1)"}
                  />
                </div>
              </div>
            )}

            <label className="label">Phản hồi của Admin:</label>
            <textarea
              rows="5"
              value={replyContent}
              onChange={e => setReplyContent(e.target.value)}
              className="input"
              placeholder={
                selectedReport.status === "dismissed" 
                  ? "Phản hồi bị từ chối vì chưa đủ căn cứ. (Bạn có thể chỉnh sửa nội dung này)"
                  : selectedReport.status === "resolved"
                  ? "Phản hồi được chấp nhận đang tiến hành xử lý (Bạn có thể chỉnh sửa nội dung này)"
                  : "Nhập phản hồi..."
              }
            />

            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button
                className="btn-submit"
                onClick={() => {
                  const newStatus = selectedReport.status === "pending" ? "resolved" : selectedReport.status;
                  changeStatus(selectedReport.report_id, newStatus, replyContent);
                }}
              >
                Lưu phản hồi
              </button>
              <button
                className="btn-ghost"
                onClick={() => {
                  setShowReplyModal(false);
                  setSelectedReport(null);
                  setReplyContent("");
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hiển thị chi tiết progress của learner */}
      {selectedLearnerId && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          overflowY: "auto"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: 8,
            padding: 24,
            maxWidth: "90%",
            width: "1200px",
            maxHeight: "90vh",
            overflowY: "auto",
            margin: "20px 0"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>
                Chi tiết tiến độ học tập - {learnersProgress.find(l => l.learner_id === selectedLearnerId)?.learner_name || "N/A"}
              </h3>
              <button
                className="btn-ghost"
                onClick={() => {
                  setSelectedLearnerId(null);
                  setSelectedLearnerAnalytics(null);
                }}
                style={{ padding: "8px 16px" }}
              >
                Đóng
              </button>
            </div>
            
            {loadingAnalytics ? (
              <div>Đang tải dữ liệu phân tích...</div>
            ) : selectedLearnerAnalytics ? (
              <ProgressAnalytics analytics={selectedLearnerAnalytics} hideRecommendations={false} />
            ) : (
              <div>Không có dữ liệu phân tích</div>
            )}
          </div>
        </div>
      )}

      {/* Modal phóng to hình ảnh/video */}
      {showMediaModal && selectedMedia.url && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            cursor: "pointer"
          }}
          onClick={() => {
            setShowMediaModal(false);
            setSelectedMedia({ type: null, url: null });
          }}
        >
          <div 
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMedia.type === "image" ? (
              <img 
                src={selectedMedia.url}
                alt="Phóng to"
                style={{
                  maxWidth: "100%",
                  maxHeight: "90vh",
                  borderRadius: 8,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
                }}
              />
            ) : (
              <video 
                src={selectedMedia.url}
                controls
                autoPlay
                style={{
                  maxWidth: "100%",
                  maxHeight: "90vh",
                  borderRadius: 8,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.5)"
                }}
              />
            )}
            <button
              onClick={() => {
                setShowMediaModal(false);
                setSelectedMedia({ type: null, url: null });
              }}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "rgba(255,255,255,0.9)",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                fontSize: "24px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                color: "#333",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
