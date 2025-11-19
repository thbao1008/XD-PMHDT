import React, { useEffect, useState } from "react";
import api from "../../api.js";
import { FaCommentDots, FaSearch } from "react-icons/fa";
import "../../styles/reportpage.css";
import UserForPage from "../admin/UserForPage.jsx";

export default function ReportsPage() {
  const [filters, setFilters] = useState({ from: "", to: "", status: "pending" });
  const [summary, setSummary] = useState({ total_reports: 0 });
  const [feedbacks, setFeedbacks] = useState([]);
  const [progress, setProgress] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);

  // State cho modal reply
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [replyContent, setReplyContent] = useState("");

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

  useEffect(() => {
    fetchSummary();
    fetchReports(filters.status);
  }, []);

  return (
    <div className="report-page">
      <h1>Báo cáo học viên, giảng viên & feedback</h1>

      {/* Bộ lọc thời gian */}
      <div className="filters">
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

      {/* Cards tổng quan - chỉ hiển thị reports (learners/mentors đã đưa lên dashboard) */}
      <div className="summary-cards" style={{ display: "flex", gap: "20px", margin: "20px 0" }}>
        <div className="card"><FaCommentDots size={30} color="orange" /><p>Tố cáo (theo thời gian)</p><h3>{summary.total_reports}</h3></div>
      </div>

      {/* Tiến độ đào tạo */}
      <section>
        <h2>Tiến độ đào tạo</h2>
        <div className="search-box">
          <FaSearch style={{ marginRight: "8px" }} />
          <input
            type="text"
            placeholder="Tìm học viên theo tên hoặc số điện thoại..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button onClick={fetchProgress}>Tìm kiếm</button>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Học viên</th>
              <th>Kỹ năng</th>
              <th>Điểm</th>
              <th>Mentor</th>
              <th>Feedback</th>
              <th>Ngày cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {progress.map(p => (
              <tr key={p.learner_id + p.stage}>
                <td>{p.name} ({p.phone})</td>
                <td>{p.stage}</td>
                <td>{p.score}</td>
                <td>{p.mentor_name}</td>
                <td>{p.feedback}</td>
                <td>{new Date(p.updated_at).toLocaleDateString("vi-VN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Phản hồi & tố cáo */}
      <section>
        <h2>Phản hồi & Tố cáo</h2>
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
                        style={{ maxWidth: "200px", maxHeight: "200px", borderRadius: 4 }}
                      />
                    </div>
                  )}
                  {f.video_url && (
                    <div style={{ marginTop: 8 }}>
                      <video 
                        src={f.video_url.startsWith("/uploads/") ? `http://localhost:4002${f.video_url}` : f.video_url}
                        controls
                        style={{ maxWidth: "300px", maxHeight: "200px", borderRadius: 4 }}
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
                    style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: 4 }}
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
                    style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: 4 }}
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
    </div>
  );
}
